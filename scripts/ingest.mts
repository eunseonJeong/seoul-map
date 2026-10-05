// 국토교통부 실거래가를 받아 DB 에 넣는다.
// 실행: npm run ingest -- [--from 2021-10] [--to 2026-10] [--gu 11680,11650] [--type sale|jeonse]
// 기본값: 최근 60개월, 25개 구 전체, 매매·전세 모두. 같은 구·월을 다시 받으면 덮어쓴다.

import { parseArgs } from "node:util"
import { district } from "@/db/schema"
import { rebuildDistrictMonthly } from "@/lib/ingest/aggregate"
import { fetchMonthDeals } from "@/lib/ingest/molit"
import { nextMonth, saveMonthDeals } from "@/lib/ingest/store"
import type { DealType } from "@/lib/types"
import { closeDb, db } from "./lib/db"

const CONCURRENCY = 4

const { values: args } = parseArgs({
  options: { from: { type: "string" }, to: { type: "string" }, gu: { type: "string" }, type: { type: "string" } },
})

const now = new Date()
const to = args.to ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
const from = args.from ?? monthsBefore(to, 59)
const months: string[] = []
for (let m = from; m <= to; m = nextMonth(m)) months.push(m)

const dealTypes: DealType[] = args.type ? [args.type as DealType] : ["sale", "jeonse"]
const guCodes = args.gu?.split(",")
const gus = (await db.select({ code: district.code, name: district.name }).from(district)).filter(
  (g) => !guCodes || guCodes.includes(g.code),
)
if (gus.length === 0) throw new Error("구가 없습니다. 먼저 npm run db:seed-districts 를 실행하세요.")

const tasks = months.flatMap((month) => gus.flatMap((gu) => dealTypes.map((dealType) => ({ month, gu, dealType }))))
console.log(`${from} ~ ${to} · 구 ${gus.length}개 · ${dealTypes.join("/")} → ${tasks.length}건 요청`)

let done = 0
let failed = 0
let tradeCount = 0
const started = Date.now()

async function worker() {
  for (let task = tasks.shift(); task; task = tasks.shift()) {
    const { month, gu, dealType } = task
    try {
      const deals = await fetchMonthDeals(dealType, gu.code, gu.name, month)
      await saveMonthDeals(db, { districtCode: gu.code, month, dealType, deals })
      tradeCount += deals.trades.length
    } catch (e) {
      failed++
      console.error(`✗ ${month} ${gu.name} ${dealType}: ${(e as Error).message}`)
    }
    if (++done % 25 === 0) console.log(`  ${done}건 완료 · 거래 ${tradeCount.toLocaleString()}건 · ${Math.round((Date.now() - started) / 1000)}초`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

await rebuildDistrictMonthly(db, months)
console.log(`완료: 요청 ${done}건 (실패 ${failed}) · 거래 ${tradeCount.toLocaleString()}건 · 구 월별 집계 ${months.length}개월`)
await closeDb()
if (failed) process.exitCode = 1

function monthsBefore(month: string, n: number) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 - n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}
