// 국토교통부 실거래가를 받아 DB 에 넣는다.
// 실행: npm run ingest -- [--from 2021-10] [--to 2026-10] [--gu 11680,11650] [--type sale|jeonse]
// 기본값: 최근 60개월, 25개 구 전체, 매매·전세 모두. 같은 구·월을 다시 받으면 덮어쓴다.

import { parseArgs } from "node:util"
import { currentMonthKst, ingestTrades, monthsBefore } from "@/lib/ingest/trades"
import type { DealType } from "@/lib/types"
import { closeDb, db } from "./lib/db"

const { values: args } = parseArgs({
  options: { from: { type: "string" }, to: { type: "string" }, gu: { type: "string" }, type: { type: "string" } },
})

const to = args.to ?? currentMonthKst()
const started = Date.now()
const r = await ingestTrades(db, {
  from: args.from ?? monthsBefore(to, 59),
  to,
  guCodes: args.gu?.split(","),
  dealTypes: args.type ? [args.type as DealType] : undefined,
  log: console.log,
})
console.log(
  `완료: 요청 ${r.requests}건 (실패 ${r.failed.length}) · 거래 ${r.trades.toLocaleString()}건 · 구 월별 집계 ${r.months.length}개월 · ${Math.round((Date.now() - started) / 1000)}초`,
)
await closeDb()
if (r.failed.length) process.exitCode = 1
