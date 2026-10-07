// 구별 생활 인프라 통계 수집: 지하철역(서울 열린데이터광장), 학교·학원(NEIS).

import { geoContains } from "d3-geo"
import type { Feature, FeatureCollection, Geometry } from "geojson"
import { sql } from "drizzle-orm"
import seoulGeo from "@/data/seoul-gu.json"
import { district, districtStat } from "@/db/schema"
import type { Database } from "./store"

type GuFeature = Feature<Geometry, { name: string }>
const guFeatures = (seoulGeo as FeatureCollection<Geometry, { name: string }>).features

// ---------- 지하철역 ----------

interface StationRow {
  BLDN_NM: string // 역명
  ROUTE: string // 호선
  LAT: string
  LOT: string // 경도
}

async function fetchStations(): Promise<StationRow[]> {
  const key = process.env.SEOUL_OPEN_API_KEY
  if (!key) throw new Error("SEOUL_OPEN_API_KEY 환경변수를 설정하세요.")
  // 한 번에 최대 1000건. 역사마스터는 800건 안팎이다.
  const res = await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/subwayStationMaster/1/1000/`, {
    signal: AbortSignal.timeout(30_000),
  })
  const json = await res.json()
  const body = json?.subwayStationMaster
  if (body?.RESULT?.CODE !== "INFO-000") {
    throw new Error(`서울 열린데이터 API 오류: ${body?.RESULT?.MESSAGE ?? json?.RESULT?.MESSAGE ?? res.status}`)
  }
  if (body.list_total_count > body.row.length) {
    throw new Error(`역 ${body.list_total_count}건 중 ${body.row.length}건만 받았습니다. 페이지 처리를 추가하세요.`)
  }
  return body.row
}

// 운영 구간명 → 승객이 쓰는 노선명 (같은 노선이 구간별로 다르게 적혀 있다)
const LINE_ALIASES: Record<string, string> = {
  경부선: "1호선",
  경원선: "1호선",
  경인선: "1호선",
  중앙선: "경의중앙선",
  공항철도1호선: "공항철도",
  "수도권 광역급행철도": "GTX-A",
}
const lineName = (route: string) => {
  const base = route.replace(/\(연장.*?\)$/, "").trim() // 9호선(연장) → 9호선
  return LINE_ALIASES[base] ?? base
}
// 같은 역이 노선마다 '서울역/서울', '삼성(무역센터)/삼성'처럼 다르게 적혀 있다
const stationName = (name: string) => name.replace(/\(.*?\)/g, "").replace(/역$/, "").trim()

/** 구 이름별 { 역 이름 집합, 노선 집합 } */
export async function collectStations() {
  const byGu = new Map<string, { stations: Set<string>; lines: Set<string> }>()
  for (const row of await fetchStations()) {
    const point: [number, number] = [Number(row.LOT), Number(row.LAT)]
    const gu = guFeatures.find((f: GuFeature) => geoContains(f, point))
    if (!gu) continue // 서울 밖 역
    const entry = byGu.get(gu.properties.name) ?? { stations: new Set(), lines: new Set() }
    entry.stations.add(stationName(row.BLDN_NM))
    entry.lines.add(lineName(row.ROUTE))
    byGu.set(gu.properties.name, entry)
  }
  return byGu
}

// ---------- NEIS ----------

type NeisRow = Record<string, string | number | null>

async function fetchNeisAll(service: string, params: Record<string, string>): Promise<NeisRow[]> {
  const key = process.env.NEIS_API_KEY
  if (!key) throw new Error("NEIS_API_KEY 환경변수를 설정하세요.")
  const PAGE = 1000
  const rows: NeisRow[] = []
  for (let page = 1; ; page++) {
    const url = new URL(`https://open.neis.go.kr/hub/${service}`)
    url.search = new URLSearchParams({ KEY: key, Type: "json", pIndex: String(page), pSize: String(PAGE), ...params }).toString()
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    const json = await res.json()
    const body = json?.[service]
    if (!body) {
      if (json?.RESULT?.CODE === "INFO-200") break // 더 이상 데이터 없음
      throw new Error(`NEIS API 오류 (${service}): ${json?.RESULT?.MESSAGE ?? res.status}`)
    }
    const pageRows: NeisRow[] = body[1]?.row ?? []
    rows.push(...pageRows)
    const total = Number(body[0]?.head?.[0]?.list_total_count ?? 0)
    if (pageRows.length < PAGE || rows.length >= total) break
  }
  return rows
}

const SCHOOL_KIND = { 초등학교: "elementary", 중학교: "middle", 고등학교: "high" } as const

export async function collectSchools(today = new Date()) {
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, "")
  const byGu = new Map<string, { elementary: number; middle: number; high: number }>()
  for (const row of await fetchNeisAll("schoolInfo", { ATPT_OFCDC_SC_CODE: "B10" })) {
    const kind = SCHOOL_KIND[String(row.SCHUL_KND_SC_NM) as keyof typeof SCHOOL_KIND]
    if (!kind) continue // 특수학교·각종학교 등은 세지 않는다
    if (String(row.FOND_YMD ?? "") > ymd) continue // 개교 전 (가칭) 학교
    const gu = /^서울특별시\s+(\S+구)/.exec(String(row.ORG_RDNMA ?? ""))?.[1]
    if (!gu) continue
    const entry = byGu.get(gu) ?? { elementary: 0, middle: 0, high: 0 }
    entry[kind]++
    byGu.set(gu, entry)
  }
  return byGu
}

export async function collectAcademies() {
  const byGu = new Map<string, { academies: number; tutoring: number; exam: number }>()
  for (const row of await fetchNeisAll("acaInsTiInfo", { ATPT_OFCDC_SC_CODE: "B10" })) {
    if (row.REG_STTUS_NM !== "개원") continue
    const gu = String(row.ADMST_ZONE_NM ?? "")
    const entry = byGu.get(gu) ?? { academies: 0, tutoring: 0, exam: 0 }
    if (row.ACA_INSTI_SC_NM === "학원") entry.academies++
    else if (row.ACA_INSTI_SC_NM === "교습소") entry.tutoring++
    else continue
    if (row.REALM_SC_NM === "입시.검정 및 보습") entry.exam++
    byGu.set(gu, entry)
  }
  return byGu
}

// ---------- 저장 ----------

export async function updateDistrictStats(db: Database) {
  const [stations, schools, academies] = await Promise.all([collectStations(), collectSchools(), collectAcademies()])
  const gus = await db.select({ code: district.code, name: district.name }).from(district)

  // 이름이 하나라도 안 맞으면 저장하지 않는다 (구 이름 표기 차이 등)
  for (const [label, map] of [["지하철", stations], ["학교", schools], ["학원", academies]] as const) {
    const missing = gus.filter((g) => !map.has(g.name)).map((g) => g.name)
    if (missing.length) throw new Error(`${label} 자료에 없는 구: ${missing.join(", ")}`)
  }

  const now = new Date()
  const rows = gus.map((g) => {
    const st = stations.get(g.name)!
    const sc = schools.get(g.name)!
    const ac = academies.get(g.name)!
    return {
      districtCode: g.code,
      subwayStations: st.stations.size,
      subwayLines: [...st.lines].sort((a, b) => a.localeCompare(b, "ko", { numeric: true })),
      elementarySchools: sc.elementary,
      middleSchools: sc.middle,
      highSchools: sc.high,
      academies: ac.academies,
      tutoringCenters: ac.tutoring,
      examAcademies: ac.exam,
      transitUpdatedAt: now,
      schoolUpdatedAt: now,
    }
  })
  await db
    .insert(districtStat)
    .values(rows)
    .onConflictDoUpdate({
      target: districtStat.districtCode,
      set: {
        subwayStations: sql`excluded.subway_stations`,
        subwayLines: sql`excluded.subway_lines`,
        elementarySchools: sql`excluded.elementary_schools`,
        middleSchools: sql`excluded.middle_schools`,
        highSchools: sql`excluded.high_schools`,
        academies: sql`excluded.academies`,
        tutoringCenters: sql`excluded.tutoring_centers`,
        examAcademies: sql`excluded.exam_academies`,
        transitUpdatedAt: sql`excluded.transit_updated_at`,
        schoolUpdatedAt: sql`excluded.school_updated_at`,
      },
    })
  return rows
}
