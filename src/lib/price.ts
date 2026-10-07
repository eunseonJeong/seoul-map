import type { AreaMonthly } from "./types"

/** 최근 거래가 있는 달의 중위가 */
export function latestPrice(monthly: AreaMonthly[], type: "sale" | "jeonse") {
  for (let i = monthly.length - 1; i >= 0; i--) {
    const v = monthly[i][type]
    if (v) return { price: v, month: monthly[i].month }
  }
  return null
}
