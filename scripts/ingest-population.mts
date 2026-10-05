// 서울 25개 구 주민등록 인구를 최신 공개월 기준으로 갱신한다.
// 실행: npm run ingest:population

import { asc } from "drizzle-orm"
import { district } from "@/db/schema"
import { updateDistrictPopulation } from "@/lib/ingest/population"
import { closeDb, db } from "./lib/db"

const ym = await updateDistrictPopulation(db)
const rows = await db
  .select({ name: district.name, population: district.population, month: district.populationMonth })
  .from(district)
  .orderBy(asc(district.code))
console.table(rows)
console.log(`${ym} 기준 주민등록 인구로 갱신했습니다.`)
await closeDb()
