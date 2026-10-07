import type { District } from "@/lib/types"

/** 고른 달(종료월) 기준으로 다시 계산한 구 시세 한 줄. 그 달 자료가 없으면 null */
export interface DistrictRow {
  code: string
  name: string
  salePerPyeong: number | null
  jeonsePerPyeong: number | null
  jeonseRatio: number | null
  weeklyChange: number | null
  change3m: number | null
  change12m: number | null
  periodChange: number | null // 시작월 → 종료월 매매 변동률
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const pct = (now: number | undefined, before: number | undefined) =>
  now && before ? Math.round(((now - before) / before) * 1000) / 10 : null

export function toRow(d: District, from: string, to: string, asOf: string): DistrictRow {
  const at = (month: string) => d.trend.find((p) => p.month === month)
  const last = at(to)
  return {
    code: d.code,
    name: d.name,
    salePerPyeong: last?.sale ?? null,
    jeonsePerPyeong: last?.jeonse ?? null,
    jeonseRatio: last ? Math.round((last.jeonse / last.sale) * 1000) / 10 : null,
    // 주간 변동률은 최신 주 값뿐이라 기준월을 볼 때만 쓴다
    weeklyChange: to === asOf ? d.weeklyChange : null,
    change3m: pct(last?.sale, at(addMonths(to, -3))?.sale),
    change12m: pct(last?.sale, at(addMonths(to, -12))?.sale),
    periodChange: from < to ? pct(last?.sale, at(from)?.sale) : null,
  }
}
