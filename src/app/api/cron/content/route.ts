import { NextResponse } from "next/server"
import { db } from "@/db"
import { isCronRequest, runSteps } from "@/lib/cron"
import { updateDistrictStats } from "@/lib/ingest/facilities"
import { updateDistrictNews } from "@/lib/ingest/news"
import { updateDistrictPopulation } from "@/lib/ingest/population"
import { updateWeeklyChange } from "@/lib/ingest/rone"

// 매일: 구별 기사, R-ONE 주간 변동률(목요일 발표)
// 매월 2일: 주민등록 인구(전월 말 기준, 다음 달 초 공개), 지하철역·학교·학원 통계
export const maxDuration = 300

export async function GET(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const kstDay = new Date(Date.now() + 9 * 3_600_000).getUTCDate()
  const monthly = kstDay === 2 || new URL(request.url).searchParams.get("monthly") === "1"

  const summary = await runSteps({
    news: () => updateDistrictNews(db),
    weekly: async () => (await updateWeeklyChange(db)).date,
    ...(monthly && {
      population: () => updateDistrictPopulation(db),
      stats: async () => (await updateDistrictStats(db)).length,
    }),
  })
  return NextResponse.json({ monthly, ...summary }, { status: summary.ok ? 200 : 500 })
}
