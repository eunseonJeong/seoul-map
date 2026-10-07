// 데이터 접근 계층. 서버 컴포넌트와 route handler 만 부른다 (DB 직접 조회).
// 시세: 국토교통부 실거래가 → trade / district_monthly (src/lib/ingest 가 수집)
// 반환 타입은 src/lib/types.ts 를 따른다.
import "server-only"

import { cache } from "react"
import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm"
import { db } from "@/db"
import {
  complex,
  complexArea,
  district,
  districtMonthly,
  districtStat,
  regionFeature,
  trade,
  watchlist,
} from "@/db/schema"
import type {
  AreaMonthly,
  Complex,
  ComplexSummary,
  District,
  DistrictFeatures,
  DistrictHighlights,
  DistrictNewsItem,
  DistrictStat,
  MonthlyPoint,
  Trade,
  WatchItem,
} from "./types"

export { latestPrice } from "./price"

const TREND_MONTHS = 24
const AREA_MONTHS = 36
const EMPTY_FEATURES: DistrictFeatures = { transit: [], school: [], life: [], development: [] }

// ---------- 월 계산 ----------

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return ym(d)
}

function monthRange(from: string, to: string) {
  const out: string[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m)
  return out
}

const pct = (now: number | undefined, before: number | undefined) =>
  now && before ? Math.round(((now - before) / before) * 1000) / 10 : NaN

/**
 * 시세 기준월: 신고 기한(계약 후 30일)이 지나 거래가 다 들어온 달 중,
 * 25개 구 모두 매매·전세 평균이 있는 가장 최근 달.
 */
export const getDataAsOf = cache(async (): Promise<string> => {
  const now = new Date()
  let m = ym(now)
  // m 월 말일 + 30일이 지나야 m 월 거래가 확정된다
  while (new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 30) >= now) m = addMonths(m, -1)

  const [row] = await db
    .select({ month: districtMonthly.month })
    .from(districtMonthly)
    .where(sql`${districtMonthly.month} <= ${m}`)
    .groupBy(districtMonthly.month)
    .having(
      sql`count(*) filter (where ${districtMonthly.sale} is not null and ${districtMonthly.jeonse} is not null)
          = (select count(*) from ${district})`,
    )
    .orderBy(desc(districtMonthly.month))
    .limit(1)
  if (!row) throw new Error("구 월별 시세가 없습니다. npm run ingest 로 실거래가를 먼저 수집하세요.")
  return row.month
})

// ---------- 구 ----------

/** 구 시세(공공) + 그 사용자가 쓴 소개·특징 */
export const getDistricts = cache(async (userId: string): Promise<District[]> => {
  const asOf = await getDataAsOf()
  const from = addMonths(asOf, -(TREND_MONTHS - 1))
  const [rows, notes, monthly] = await Promise.all([
    db.select().from(district).orderBy(asc(district.code)),
    db.select().from(regionFeature).where(eq(regionFeature.userId, userId)),
    db
      .select()
      .from(districtMonthly)
      .where(and(gte(districtMonthly.month, from), sql`${districtMonthly.month} <= ${asOf}`))
      .orderBy(asc(districtMonthly.month)),
  ])

  const noteByCode = new Map(notes.map((n) => [n.districtCode, n]))
  return rows.map((d) => {
    const note = noteByCode.get(d.code)
    const trend: MonthlyPoint[] = monthly
      .filter((m) => m.districtCode === d.code && m.sale != null && m.jeonse != null)
      .map((m) => ({ month: m.month, sale: m.sale!, jeonse: m.jeonse! }))
    const at = (month: string) => trend.find((p) => p.month === month)
    const last = at(asOf)!
    return {
      code: d.code,
      name: d.name,
      nameEng: d.nameEng,
      summary: note?.summary ?? "",
      population: d.population,
      populationMonth: d.populationMonth,
      salePerPyeong: last.sale,
      jeonsePerPyeong: last.jeonse,
      jeonseRatio: Math.round((last.jeonse / last.sale) * 1000) / 10,
      change3m: pct(last.sale, at(addMonths(asOf, -3))?.sale),
      change12m: pct(last.sale, at(addMonths(asOf, -12))?.sale),
      weeklyChange: d.weeklyChange,
      weeklyChangeDate: d.weeklyChangeDate,
      trend,
      features: { ...EMPTY_FEATURES, ...note?.features },
    }
  })
})

export async function districtExists(code: string) {
  return (await db.select({ code: district.code }).from(district).where(eq(district.code, code))).length > 0
}

/** 사용자가 쓰는 구 소개·특징 */
export async function updateDistrictProfile(userId: string, code: string, input: { summary: string; features: DistrictFeatures }) {
  if (!(await districtExists(code))) return false
  await db
    .insert(regionFeature)
    .values({ userId, districtCode: code, ...input })
    .onConflictDoUpdate({ target: [regionFeature.userId, regionFeature.districtCode], set: input })
  return true
}

export async function getDistrictMemos(userId: string): Promise<Record<string, string>> {
  const rows = await db.select().from(regionFeature).where(eq(regionFeature.userId, userId))
  return Object.fromEntries(rows.map((r) => [r.districtCode, r.memo]))
}

export async function setDistrictMemo(userId: string, code: string, memo: string) {
  await db
    .insert(regionFeature)
    .values({ userId, districtCode: code, memo })
    .onConflictDoUpdate({ target: [regionFeature.userId, regionFeature.districtCode], set: { memo } })
}

type Row<T> = T & Record<string, unknown>

// 구 패널: 거래 많은 단지·최근 기사는 집계가 무거워서 서버 인스턴스마다 10분간 재사용한다
let highlightsCache: { at: number; value: Promise<Record<string, Omit<DistrictHighlights, "stat">>> } | null = null

function loadHighlights() {
  if (highlightsCache && Date.now() - highlightsCache.at < 10 * 60_000) return highlightsCache.value
  const value = (async () => {
    const [complexRows, newsRows] = await Promise.all([
      db.execute<Row<ComplexSummary & { districtCode: string }>>(sql`
        select id, name, dong, built_year as "builtYear", district_code as "districtCode", sale_count as "saleCount"
        from (
          select c.id, c.name, c.dong, c.built_year, c.district_code, count(*)::int as sale_count,
                 row_number() over (partition by c.district_code order by count(*) desc, c.name) as rn
          from trade t join complex c on c.id = t.complex_id
          where t.deal_type = 'sale' and not t.is_cancelled and t.contract_date >= current_date - interval '12 months'
          group by c.id
        ) x
        where rn <= 8
        order by district_code, rn`),
      db.execute<Row<DistrictNewsItem & { districtCode: string }>>(sql`
        select district_code as "districtCode", title, description, url, published_at as "publishedAt"
        from (
          select *, row_number() over (partition by district_code order by published_at desc) as rn
          from district_news
        ) x
        where rn <= 5
        order by district_code, published_at desc`),
    ])
    const out: Record<string, Omit<DistrictHighlights, "stat">> = {}
    const entry = (code: string) => (out[code] ??= { complexes: [], news: [] })
    for (const { districtCode, ...c } of complexRows) entry(districtCode).complexes.push(c)
    for (const { districtCode, ...n } of newsRows) {
      entry(districtCode).news.push({ ...n, publishedAt: new Date(n.publishedAt).toISOString() })
    }
    return out
  })()
  // 조회가 멈추면 그 결과를 계속 재사용하지 않도록 15초 안에 끝나지 않으면 버린다
  const guarded = Promise.race([
    value,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("구 패널 집계 시간 초과")), 15_000)),
  ])
  guarded.catch(() => {
    if (highlightsCache?.value === guarded) highlightsCache = null
  })
  highlightsCache = { at: Date.now(), value: guarded }
  return guarded
}

export async function getDistrictHighlights(): Promise<Record<string, DistrictHighlights>> {
  const [base, stats] = await Promise.all([loadHighlights(), db.select().from(districtStat)])
  const statByCode = new Map(stats.map((s) => [s.districtCode, s]))
  const codes = new Set([...Object.keys(base), ...statByCode.keys()])
  return Object.fromEntries(
    [...codes].map((code) => {
      const s = statByCode.get(code)
      const stat: DistrictStat | null = s
        ? {
            subwayStations: s.subwayStations,
            subwayLines: s.subwayLines ?? [],
            elementarySchools: s.elementarySchools,
            middleSchools: s.middleSchools,
            highSchools: s.highSchools,
            academies: s.academies,
            tutoringCenters: s.tutoringCenters,
            examAcademies: s.examAcademies,
          }
        : null
      return [code, { complexes: base[code]?.complexes ?? [], news: base[code]?.news ?? [], stat }]
    }),
  )
}

// ---------- 단지 ----------

type ComplexRow = typeof complex.$inferSelect

async function withAreas(rows: ComplexRow[]): Promise<Complex[]> {
  if (rows.length === 0) return []
  const areaRows = await db
    .selectDistinct({ complexId: complexArea.complexId, area: sql<number>`floor(${complexArea.area})::int` })
    .from(complexArea)
    .where(sql`${complexArea.complexId} in ${rows.map((r) => r.id)}`)
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    districtCode: r.districtCode,
    dong: r.dong,
    address: r.address,
    builtYear: r.builtYear,
    households: r.households,
    lat: r.lat,
    lng: r.lng,
    areas: areaRows
      .filter((a) => a.complexId === r.id)
      .map((a) => a.area)
      .sort((a, b) => a - b),
  }))
}

export async function getComplex(id: string): Promise<Complex | undefined> {
  const rows = await db.select().from(complex).where(eq(complex.id, id))
  return (await withAreas(rows))[0]
}

export async function getComplexesByIds(ids: string[]): Promise<Complex[]> {
  if (ids.length === 0) return []
  return withAreas(await db.select().from(complex).where(sql`${complex.id} in ${ids}`))
}

export interface ComplexSearchResult {
  id: string
  name: string
  dong: string
  guName: string
}

/** 단지명·동·구 이름으로 검색 */
export async function searchComplexes(q: string, limit = 10): Promise<ComplexSearchResult[]> {
  const s = q.trim()
  if (!s) return []
  const like = `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  return db
    .select({ id: complex.id, name: complex.name, dong: complex.dong, guName: district.name })
    .from(complex)
    .innerJoin(district, eq(district.code, complex.districtCode))
    .where(or(ilike(complex.name, like), ilike(complex.dong, like), ilike(district.name, like)))
    .orderBy(sql`${complex.name} ilike ${`${s}%`} desc`, asc(complex.name))
    .limit(limit)
}

/** 단지·면적(소수점 버림)별 월 중위가. 최근 36개월, 거래 없는 달은 null */
export async function getAreaMonthly(complexId: string, area: number): Promise<AreaMonthly[]> {
  const to = ym(new Date())
  const from = addMonths(to, -(AREA_MONTHS - 1))
  const rows = await db
    .select({
      month: sql<string>`to_char(${trade.contractDate}, 'YYYY-MM')`,
      sale: sql<number | null>`round(percentile_cont(0.5) within group (order by ${trade.price})
              filter (where ${trade.dealType} = 'sale' and not ${trade.isCancelled}))::int`,
      jeonse: sql<number | null>`round(percentile_cont(0.5) within group (order by ${trade.price})
              filter (where ${trade.dealType} = 'jeonse' and not ${trade.isRenewal}))::int`,
      saleCount: sql<number>`(count(*) filter (where ${trade.dealType} = 'sale' and not ${trade.isCancelled}))::int`,
      jeonseCount: sql<number>`(count(*) filter (where ${trade.dealType} = 'jeonse' and not ${trade.isRenewal}))::int`,
    })
    .from(trade)
    .where(
      and(
        eq(trade.complexId, complexId),
        sql`floor(${trade.area}) = ${area}`,
        gte(trade.contractDate, `${from}-01`),
      ),
    )
    .groupBy(sql`1`)
  const byMonth = new Map(rows.map((r) => [r.month, r]))
  return monthRange(from, to).map(
    (month) => byMonth.get(month) ?? { month, sale: null, jeonse: null, saleCount: 0, jeonseCount: 0 },
  )
}

/** 최근 24개월 거래 (최신순) */
export async function getTrades(complexId: string, area: number): Promise<Trade[]> {
  const from = addMonths(ym(new Date()), -23)
  return db
    .select({
      complexId: trade.complexId,
      dealType: trade.dealType,
      area: trade.area,
      floor: trade.floor,
      price: trade.price,
      contractDate: trade.contractDate,
      isCancelled: trade.isCancelled,
      isRenewal: trade.isRenewal,
    })
    .from(trade)
    .where(
      and(eq(trade.complexId, complexId), sql`floor(${trade.area}) = ${area}`, gte(trade.contractDate, `${from}-01`)),
    )
    .orderBy(desc(trade.contractDate), desc(trade.id))
    .limit(300)
}

// ---------- 관심 단지 ----------

type WatchRow = typeof watchlist.$inferSelect
const toWatchItem = (w: WatchRow): WatchItem => ({
  id: w.id,
  complexId: w.complexId,
  area: w.area,
  baseSalePrice: w.baseSalePrice,
  baseJeonsePrice: w.baseJeonsePrice,
  baseDate: w.baseDate,
  memo: w.memo,
  createdAt: w.createdAt.toISOString(),
})

export async function listWatchlist(userId: string): Promise<WatchItem[]> {
  return (
    await db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.createdAt))
  ).map(toWatchItem)
}

export async function addWatch(userId: string, input: Omit<WatchItem, "id" | "createdAt">): Promise<WatchItem> {
  const [row] = await db
    .insert(watchlist)
    .values({ ...input, userId })
    .onConflictDoUpdate({
      target: [watchlist.userId, watchlist.complexId, watchlist.area],
      set: {
        baseSalePrice: input.baseSalePrice,
        baseJeonsePrice: input.baseJeonsePrice,
        baseDate: input.baseDate,
        memo: input.memo,
      },
    })
    .returning()
  return toWatchItem(row)
}

export async function removeWatch(userId: string, id: string) {
  const rows = await db
    .delete(watchlist)
    .where(and(eq(watchlist.id, id), eq(watchlist.userId, userId)))
    .returning({ id: watchlist.id })
  return rows.length > 0
}

export async function updateWatchMemo(userId: string, id: string, memo: string) {
  const [row] = await db
    .update(watchlist)
    .set({ memo })
    .where(and(eq(watchlist.id, id), eq(watchlist.userId, userId)))
    .returning()
  return row ? toWatchItem(row) : null
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
