import { NextResponse } from "next/server"
import { db } from "@/db"
import { isCronRequest, runSteps } from "@/lib/cron"
import { currentMonthKst, ingestTrades, monthsBefore } from "@/lib/ingest/trades"

// 매일: 최근 3개월 실거래를 다시 받는다 (신고 기한 30일이라 최근 달은 계속 늘어난다)
export const maxDuration = 300

export async function GET(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const to = currentMonthKst()
  const summary = await runSteps({
    trades: async () => {
      const r = await ingestTrades(db, { from: monthsBefore(to, 2), to, log: console.log })
      if (r.failed.length) throw new Error(`실패 ${r.failed.length}건: ${r.failed.slice(0, 5).join(", ")}`)
      return { requests: r.requests, trades: r.trades, months: r.months }
    },
  })
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 })
}
