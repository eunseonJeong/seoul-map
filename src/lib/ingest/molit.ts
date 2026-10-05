// 국토교통부 실거래가 API (공공데이터포털) 호출과 정규화.
// - 매매: 아파트 매매 실거래가 상세 자료 (RTMSDataSvcAptTradeDev)
// - 전세: 아파트 전월세 실거래가 자료 (RTMSDataSvcAptRent) 중 월세 0원인 거래
// 요청 단위는 구(법정동 코드 앞 5자리) × 계약년월. 응답은 XML, 페이지당 최대 1000건.

import { XMLParser } from "fast-xml-parser"
import type { DealType } from "@/lib/types"

const BASE = "https://apis.data.go.kr/1613000"
const ENDPOINT: Record<DealType, string> = {
  sale: "RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
  jeonse: "RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
}
const PAGE_SIZE = 1000

// 값은 모두 문자열로 받는다 (지번 '0719' 같은 앞자리 0 보존). item 이 1건이어도 배열로.
const parser = new XMLParser({ parseTagValue: false, trimValues: true, isArray: (name) => name === "item" })

type RawItem = Record<string, string | undefined>

export interface ComplexRow {
  id: string
  name: string
  districtCode: string
  dong: string
  address: string
  builtYear: number | null
}

export interface TradeRow {
  complexId: string
  dealType: DealType
  area: number
  floor: number
  price: number
  contractDate: string
  isCancelled: boolean
  isRenewal: boolean
}

export interface MonthDeals {
  complexes: ComplexRow[]
  areas: { complexId: string; area: number }[]
  trades: TradeRow[]
  rawCount: number
}

async function fetchPage(dealType: DealType, lawdCd: string, ym: string, pageNo: number) {
  const key = process.env.DATA_GO_KR_SERVICE_KEY
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY 환경변수를 설정하세요.")
  const url = new URL(`${BASE}/${ENDPOINT[dealType]}`)
  url.search = new URLSearchParams({
    serviceKey: key,
    LAWD_CD: lawdCd,
    DEAL_YMD: ym.replace("-", ""),
    pageNo: String(pageNo),
    numOfRows: String(PAGE_SIZE),
  }).toString()

  const text = await withRetry(async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
    return res.text()
  })

  const doc = parser.parse(text)
  const header = doc?.response?.header
  if (header?.resultCode !== "000") {
    // 인증키 오류·트래픽 초과 등은 다른 형식의 XML 로 온다
    const msg = header?.resultMsg ?? doc?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ?? text.slice(0, 200)
    throw new Error(`실거래가 API 오류 (${dealType} ${lawdCd} ${ym}): ${msg}`)
  }
  const body = doc.response.body
  return { items: (body?.items?.item ?? []) as RawItem[], totalCount: Number(body?.totalCount ?? 0) }
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i >= tries) throw e
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i))
    }
  }
}

/** 한 구·한 달치 거래를 모두 받아 DB 에 넣을 모양으로 바꾼다. */
export async function fetchMonthDeals(dealType: DealType, lawdCd: string, guName: string, ym: string): Promise<MonthDeals> {
  const raw: RawItem[] = []
  for (let page = 1; ; page++) {
    const { items, totalCount } = await fetchPage(dealType, lawdCd, ym, page)
    raw.push(...items)
    if (items.length === 0 || raw.length >= totalCount) break
  }

  const complexes = new Map<string, ComplexRow>()
  const areas = new Map<string, { complexId: string; area: number }>()
  const trades: TradeRow[] = []

  for (const it of raw) {
    const trade = toTrade(dealType, it)
    if (!trade) continue
    trades.push(trade)
    areas.set(`${trade.complexId}|${trade.area}`, { complexId: trade.complexId, area: trade.area })
    if (!complexes.has(trade.complexId)) {
      const dong = it.umdNm ?? ""
      complexes.set(trade.complexId, {
        id: trade.complexId,
        name: it.aptNm ?? "",
        districtCode: lawdCd,
        dong,
        address: ["서울", guName, dong, it.jibun].filter(Boolean).join(" "),
        builtYear: toInt(it.buildYear),
      })
    }
  }

  // 여러 구·월을 동시에 넣을 때 행 잠금 순서가 같도록 id 순으로 정렬한다 (교착 방지)
  const byId = (x: { complexId?: string; id?: string; area?: number }, y: typeof x) =>
    (x.id ?? x.complexId!).localeCompare(y.id ?? y.complexId!) || (x.area ?? 0) - (y.area ?? 0)
  return {
    complexes: [...complexes.values()].sort(byId),
    areas: [...areas.values()].sort(byId),
    trades,
    rawCount: raw.length,
  }
}

function toTrade(dealType: DealType, it: RawItem): TradeRow | null {
  const complexId = it.aptSeq
  const area = Number(it.excluUseAr)
  const floor = toInt(it.floor)
  const [y, m, d] = [toInt(it.dealYear), toInt(it.dealMonth), toInt(it.dealDay)]
  if (!complexId || !(area > 0) || floor == null || !y || !m || !d) return null

  let price: number | null
  if (dealType === "sale") {
    price = toInt(it.dealAmount)
  } else {
    if (toInt(it.monthlyRent) !== 0) return null // 월세는 저장하지 않는다
    price = toInt(it.deposit)
  }
  if (!price) return null

  return {
    complexId,
    dealType,
    area: Math.round(area * 100) / 100, // 84.943 → 84.94
    floor,
    price,
    contractDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    isCancelled: dealType === "sale" && it.cdealType === "O",
    isRenewal: dealType === "jeonse" && it.contractType === "갱신",
  }
}

function toInt(v: string | undefined) {
  if (!v) return null
  const n = Number(v.replace(/,/g, ""))
  return Number.isInteger(n) ? n : null
}
