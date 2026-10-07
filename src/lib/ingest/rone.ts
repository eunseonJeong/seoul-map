// 한국부동산원 R-ONE 주간 아파트 매매가격지수 → 구별 주간 변동률.
// 변동률 = (이번 주 지수 ÷ 지난주 지수 − 1) × 100. R-ONE 이 발표하는 주간 변동률과 같은 계산이다.
// 매주 목요일 발표. 주 식별자는 ISO 주(YYYYWW, 202601 = 2025-12-29 주).

import { eq } from "drizzle-orm"
import { district } from "@/db/schema"
import type { Database } from "./store"

const URL_BASE = "https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do"
const WEEKLY_SALE_INDEX = "T244183132827305" // (주) 매매가격지수

interface RoneRow {
  WRTTIME_IDTFR_ID: string // 주 식별자
  WRTTIME_DESC: string // 주 시작일 YYYY-MM-DD
  CLS_NM: string // 지역명
  CLS_FULLNM: string // 서울>강남지역>동남권>강남구
  ITM_NM: string
  DTA_VAL: number
}

/** ISO 주 식별자 YYYYWW */
function isoWeekId(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day) // 그 주의 목요일
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${t.getUTCFullYear()}${String(week).padStart(2, "0")}`
}

async function fetchWeeks(from: string, to: string): Promise<RoneRow[]> {
  const key = process.env.R_ONE_API_KEY
  if (!key) throw new Error("R_ONE_API_KEY 환경변수를 설정하세요.")
  const rows: RoneRow[] = []
  for (let page = 1; ; page++) {
    const url = new URL(URL_BASE)
    url.search = new URLSearchParams({
      KEY: key,
      Type: "json",
      pIndex: String(page),
      pSize: "1000",
      STATBL_ID: WEEKLY_SALE_INDEX,
      DTACYCLE_CD: "WK",
      START_WRTTIME: from,
      END_WRTTIME: to,
    }).toString()
    const json = await (await fetch(url, { signal: AbortSignal.timeout(30_000) })).json()
    const body = json?.SttsApiTblData
    if (!body) {
      if (json?.RESULT?.CODE === "INFO-200") break
      throw new Error(`R-ONE API 오류: ${json?.RESULT?.MESSAGE ?? JSON.stringify(json).slice(0, 200)}`)
    }
    const pageRows: RoneRow[] = body[1]?.row ?? []
    rows.push(...pageRows)
    const total = Number(body[0]?.head?.[0]?.list_total_count ?? 0)
    if (pageRows.length < 1000 || rows.length >= total) break
  }
  return rows
}

/** 최근 발표된 주의 구별 변동률을 저장한다. 기준 주(YYYY-MM-DD)를 돌려준다. */
export async function updateWeeklyChange(db: Database, now = new Date()) {
  const rows = (await fetchWeeks(isoWeekId(new Date(now.getTime() - 42 * 86_400_000)), isoWeekId(now))).filter(
    (r) => r.CLS_FULLNM.startsWith("서울>") && r.CLS_NM.endsWith("구") && r.ITM_NM === "지수",
  )
  const weeks = [...new Set(rows.map((r) => r.WRTTIME_IDTFR_ID))].sort()
  if (weeks.length < 2) throw new Error("R-ONE 에서 최근 2주치 지수를 받지 못했습니다.")
  const [prevWeek, lastWeek] = weeks.slice(-2)

  const gus = await db.select({ code: district.code, name: district.name }).from(district)
  const index = (week: string, name: string) => rows.find((r) => r.WRTTIME_IDTFR_ID === week && r.CLS_NM === name)
  const values = gus.map((g) => {
    const cur = index(lastWeek, g.name)
    const prev = index(prevWeek, g.name)
    if (!cur || !prev) throw new Error(`R-ONE 자료에 ${g.name} 지수가 없습니다 (${prevWeek}, ${lastWeek}).`)
    return { code: g.code, change: Math.round((cur.DTA_VAL / prev.DTA_VAL - 1) * 10_000) / 100, date: cur.WRTTIME_DESC }
  })

  await db.transaction(async (tx) => {
    for (const v of values) {
      await tx.update(district).set({ weeklyChange: v.change, weeklyChangeDate: v.date }).where(eq(district.code, v.code))
    }
  })
  return { date: values[0].date, values }
}
