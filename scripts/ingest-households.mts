// 단지 세대수·도로명 주소를 K-apt 공동주택 기본정보로 채운다. 구별로 바로 저장한다.
// 실행: npm run ingest:households -- [--gu 11350,11380]   (K-apt 단지 3천여 곳 → API 호출 3천여 건)

import { parseArgs } from "node:util"
import { updateComplexHouseholds } from "@/lib/ingest/kapt"
import { closeDb, db } from "./lib/db"

const { values: args } = parseArgs({ options: { gu: { type: "string" } } })
const r = await updateComplexHouseholds(db, { guCodes: args.gu?.split(","), onProgress: (msg) => console.log(`  ${msg}`) })
console.log(
  `K-apt 단지 ${r.kaptTotal}곳 중 ${r.matchedKapt}곳을 실거래 단지와 연결 → 단지 ${r.complexesUpdated}곳 갱신` +
    ` (세대수 있음 ${r.withHouseholds}곳, 기본정보 실패 ${r.basisFailed}곳)`,
)
if (r.failedGus.length) {
  console.log(`목록을 못 받은 구: ${r.failedGus.join(",")} → npm run ingest:households -- --gu ${r.failedGus.join(",")}`)
  process.exitCode = 1
}
await closeDb()
