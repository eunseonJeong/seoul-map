import { getComplexesByIds, listWatchlist } from "@/lib/api"
import { requireUser } from "@/lib/users"
import { listVisits } from "@/lib/visits"
import type { WatchOption } from "./complex-name-input"
import { VisitsView } from "./visits-view"

export const metadata = { title: "임장 노트 · 모두 부동산" }

export default async function VisitsPage() {
  const user = await requireUser()
  const [visits, watch] = await Promise.all([listVisits(user.id), listWatchlist(user.id)])
  // 연결할 수 있는 단지: 관심 단지 + 이미 노트에 연결된 단지
  const ids = new Set([...watch.map((w) => w.complexId), ...visits.flatMap((v) => (v.complexId ? [v.complexId] : []))])
  const complexes = (await getComplexesByIds([...ids])).sort((a, b) => a.name.localeCompare(b.name, "ko"))
  // 단지명 칸에서 고를 수 있는 찜한 관심 단지 (면적별)
  const watchOptions: WatchOption[] = watch
    .flatMap((w) => {
      const c = complexes.find((x) => x.id === w.complexId)
      return c ? [{ complexId: c.id, name: c.name, location: c.address.split(" ").slice(1, 3).join(" ") /* "서울 강남구 대치동 316" → "강남구 대치동" */, area: w.area }] : []
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.area - b.area)
  return <VisitsView initialVisits={visits} complexes={complexes} watchOptions={watchOptions} />
}
