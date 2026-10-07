// 서울 25개 구 주민등록 인구 (행정안전부_법정동별 주민등록 인구 및 세대현황).
// 매월 말일 기준으로 집계되어 다음 달에 공개된다. lv=2 로 부르면 시군구 단위 합계가 온다.

import { eq } from "drizzle-orm"
import { district } from "@/db/schema"
import type { Database } from "./store"

const URL_BASE = "https://apis.data.go.kr/1741000/stdgPpltnHhStus/selectStdgPpltnHhStus"

interface PopulationItem {
  stdgCd: string // 법정동 코드 10자리, 앞 5자리가 구 코드
  sggNm: string
  totNmprCnt: string // 총인구수
  statsYm: string // YYYYMM
}

async function fetchSeoulPopulation(ym: string): Promise<PopulationItem[]> {
  const key = process.env.DATA_GO_KR_SERVICE_KEY
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY 환경변수를 설정하세요.")
  const url = new URL(URL_BASE)
  url.search = new URLSearchParams({
    serviceKey: key,
    stdgCd: "1100000000",
    srchFrYm: ym.replace("-", ""),
    srchToYm: ym.replace("-", ""),
    lv: "2",
    regSeCd: "1",
    type: "JSON",
    numOfRows: "100",
    pageNo: "1",
  }).toString()

  // 이 API 는 응답이 느리고 가끔 504 를 준다
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      const json = await res.json()
      const head = json?.Response?.head
      if (!head) {
        const msg = json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ?? `HTTP ${res.status}`
        throw new Error(`인구 API 오류 (${ym}): ${msg}`)
      }
      if (head.resultCode !== "0") return [] // 해당 월 자료 없음
      const items = json.Response.items?.item ?? []
      return Array.isArray(items) ? items : [items]
    } catch (e) {
      if (i >= 3) throw e
      await new Promise((r) => setTimeout(r, 2000 * i))
    }
  }
}

/** 가장 최근 공개된 달의 구별 인구를 찾아 저장한다. 저장한 기준월을 돌려준다. */
export async function updateDistrictPopulation(db: Database, now = new Date()): Promise<string> {
  for (let back = 1; back <= 4; back++) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - back, 1))
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const items = (await fetchSeoulPopulation(ym)).filter((it) => it.stdgCd?.startsWith("11"))
    if (items.length < 25) continue

    const values = items.map((it) => ({ code: it.stdgCd.slice(0, 5), population: Number(it.totNmprCnt) }))
    if (values.some((v) => !Number.isInteger(v.population) || v.population <= 0)) {
      throw new Error(`인구 API 응답에 잘못된 값이 있습니다 (${ym})`)
    }
    await db.transaction(async (tx) => {
      for (const v of values) {
        await tx
          .update(district)
          .set({ population: v.population, populationMonth: ym })
          .where(eq(district.code, v.code))
      }
    })
    return ym
  }
  throw new Error("최근 4개월 안에 공개된 인구 통계를 찾지 못했습니다.")
}
