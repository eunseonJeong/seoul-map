import { getComplexesByIds, listWatchlist } from "@/lib/api"
import { listVisits } from "@/lib/visits"
import { VisitsView } from "./visits-view"

export const metadata = { title: "임장 노트 · 서울 부동산" }

export default async function VisitsPage() {
  const [visits, watch] = await Promise.all([listVisits(), listWatchlist()])
  // 연결할 수 있는 단지: 관심 단지 + 이미 노트에 연결된 단지
  const ids = new Set([...watch.map((w) => w.complexId), ...visits.flatMap((v) => (v.complexId ? [v.complexId] : []))])
  const complexes = (await getComplexesByIds([...ids])).sort((a, b) => a.name.localeCompare(b.name, "ko"))
  return <VisitsView initialVisits={visits} complexes={complexes} />
}
