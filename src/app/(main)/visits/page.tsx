import { connection } from "next/server"
import { getComplexes } from "@/lib/api"
import { listVisits } from "@/lib/visits"
import { VisitsView } from "./visits-view"

export const metadata = { title: "임장 노트 · 서울 부동산" }

export default async function VisitsPage() {
  await connection() // 저장된 기록은 요청마다 새로 읽는다
  const [visits, complexes] = await Promise.all([listVisits(), getComplexes()])
  return <VisitsView initialVisits={visits} complexes={complexes} />
}
