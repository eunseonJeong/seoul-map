import { getAreaMonthly, getComplexesByIds, getDistricts, listWatchlist } from "@/lib/api"
import { latestPrice } from "@/lib/price"
import { WatchlistView, type PriceSnapshot } from "./watchlist-view"

export const metadata = { title: "관심 단지 · 서울 부동산" }

export default async function WatchlistPage() {
  const [items, districts] = await Promise.all([listWatchlist(), getDistricts()])
  const complexes = await getComplexesByIds([...new Set(items.map((w) => w.complexId))])

  // 체크한 단지·면적의 최신 실거래 중위가
  const prices: Record<string, PriceSnapshot> = {}
  await Promise.all(
    items.map(async (w) => {
      const monthly = await getAreaMonthly(w.complexId, w.area)
      prices[`${w.complexId}-${w.area}`] = {
        sale: latestPrice(monthly, "sale"),
        jeonse: latestPrice(monthly, "jeonse"),
        trend: monthly.slice(-12).map((m) => m.sale),
      }
    }),
  )

  return <WatchlistView initialItems={items} complexes={complexes} districts={districts} prices={prices} />
}
