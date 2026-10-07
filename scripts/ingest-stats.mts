// 구별 생활 인프라 통계(지하철역·학교·학원)를 갱신한다.
// 실행: npm run ingest:stats   (SEOUL_OPEN_API_KEY, NEIS_API_KEY 필요)

import { updateDistrictStats } from "@/lib/ingest/facilities"
import { district } from "@/db/schema"
import { closeDb, db } from "./lib/db"

const rows = await updateDistrictStats(db)
const names = new Map((await db.select({ code: district.code, name: district.name }).from(district)).map((d) => [d.code, d.name]))
console.table(
  rows.map((r) => ({
    구: names.get(r.districtCode),
    역: r.subwayStations,
    노선: r.subwayLines.length,
    초: r.elementarySchools,
    중: r.middleSchools,
    고: r.highSchools,
    학원: r.academies,
    교습소: r.tutoringCenters,
    "입시·보습": r.examAcademies,
  })),
)
await closeDb()
