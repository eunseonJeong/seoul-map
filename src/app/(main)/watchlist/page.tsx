import { getAreaMonthly, getComplexes, getDistricts } from "@/lib/api"
import { latestPrice } from "@/lib/price"
import { WatchlistView, type PriceSnapshot } from "./watchlist-view"

export const metadata = { title: "관심 단지 · 서울 부동산" }

export default async function WatchlistPage() {
  const [complexes, districts] = await Promise.all([getComplexes(), getDistricts()])

  // TODO(백엔드 연결): watchlist 테이블을 서버에서 읽고, 체크한 단지의 최신가만 조회
  const prices: Record<string, PriceSnapshot> = {}
  for (const c of complexes) {
    for (const area of c.areas) {
      const monthly = await getAreaMonthly(c.id, area)
      prices[`${c.id}-${area}`] = {
        sale: latestPrice(monthly, "sale"),
        jeonse: latestPrice(monthly, "jeonse"),
        trend: monthly.slice(-12).map((m) => m.sale),
      }
    }
  }

  return <WatchlistView complexes={complexes} districts={districts} prices={prices} />
}
