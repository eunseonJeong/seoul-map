// 구별 부동산 관련 기사를 갱신한다 (최근 30일만 보관).
// 실행: npm run ingest:news

import { desc, eq, sql } from "drizzle-orm"
import { district, districtNews } from "@/db/schema"
import { updateDistrictNews } from "@/lib/ingest/news"
import { closeDb, db } from "./lib/db"

const { saved, removed } = await updateDistrictNews(db)
console.log(`새 기사 ${saved}건 저장, 오래된 기사 ${removed}건 삭제`)

console.table(
  await db
    .select({ 구: district.name, 기사: sql<number>`count(${districtNews.id})::int` })
    .from(district)
    .leftJoin(districtNews, eq(districtNews.districtCode, district.code))
    .groupBy(district.name)
    .orderBy(desc(sql`count(${districtNews.id})`)),
)
await closeDb()
