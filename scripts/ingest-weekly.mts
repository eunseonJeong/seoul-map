// R-ONE 주간 아파트 매매가격 변동률(구별)을 갱신한다.
// 실행: npm run ingest:weekly

import { updateWeeklyChange } from "@/lib/ingest/rone"
import { district } from "@/db/schema"
import { closeDb, db } from "./lib/db"

const { date, values } = await updateWeeklyChange(db)
const names = new Map((await db.select({ code: district.code, name: district.name }).from(district)).map((d) => [d.code, d.name]))
console.table(values.map((v) => ({ 구: names.get(v.code), "주간 변동(%)": v.change })))
console.log(`${date} 주 기준 R-ONE 주간 변동률로 갱신했습니다.`)
await closeDb()
