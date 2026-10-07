// 실거래가 수집 실행: 구·월·거래유형별로 받아 저장하고 구 월별 시세를 다시 집계한다.
// npm run ingest 와 매일 도는 cron(/api/cron/trades)이 같이 쓴다.

import { district } from "@/db/schema"
import type { DealType } from "@/lib/types"
import { rebuildDistrictMonthly } from "./aggregate"
import { fetchMonthDeals } from "./molit"
import { nextMonth, saveMonthDeals, type Database } from "./store"

/** 'YYYY-MM' 의 n 달 전 */
export function monthsBefore(month: string, n: number) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 - n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

/** 한국 시간 기준 이번 달 'YYYY-MM' */
export function currentMonthKst(now = new Date()) {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 7)
}

export async function ingestTrades(
  db: Database,
  {
    from,
    to,
    guCodes,
    dealTypes = ["sale", "jeonse"],
    concurrency = 4,
    log = () => {},
  }: { from: string; to: string; guCodes?: string[]; dealTypes?: DealType[]; concurrency?: number; log?: (msg: string) => void },
) {
  const months: string[] = []
  for (let m = from; m <= to; m = nextMonth(m)) months.push(m)
  const gus = (await db.select({ code: district.code, name: district.name }).from(district)).filter(
    (g) => !guCodes || guCodes.includes(g.code),
  )
  if (gus.length === 0) throw new Error("구가 없습니다. 먼저 npm run db:seed-districts 를 실행하세요.")

  const tasks = months.flatMap((month) => gus.flatMap((gu) => dealTypes.map((dealType) => ({ month, gu, dealType }))))
  log(`${from} ~ ${to} · 구 ${gus.length}개 · ${dealTypes.join("/")} → ${tasks.length}건 요청`)

  const result = { requests: tasks.length, failed: [] as string[], trades: 0, months }
  let done = 0
  async function worker() {
    for (let task = tasks.shift(); task; task = tasks.shift()) {
      const { month, gu, dealType } = task
      try {
        const deals = await fetchMonthDeals(dealType, gu.code, gu.name, month)
        await saveMonthDeals(db, { districtCode: gu.code, month, dealType, deals })
        result.trades += deals.trades.length
      } catch (e) {
        result.failed.push(`${month} ${gu.name} ${dealType}`)
        log(`✗ ${month} ${gu.name} ${dealType}: ${(e as Error).message}`)
      }
      if (++done % 25 === 0) log(`  ${done}건 완료 · 거래 ${result.trades.toLocaleString()}건`)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  await rebuildDistrictMonthly(db, months)
  return result
}
