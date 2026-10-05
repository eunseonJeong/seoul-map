// 서울 25개 구 코드·이름을 넣는다. 이미 있는 구는 건드리지 않는다 (화면에서 쓴 소개 문구 보존).
// 소개 문구·특징은 비워 두고 사용자가 직접 채운다.
// 실행: npm run db:seed-districts
// 인구는 넣지 않는다 (주민등록 인구통계에서 따로 수집).

import { district } from "@/db/schema"
import districts from "./data/districts.json" with { type: "json" }
import { closeDb, db } from "./lib/db"

const EMPTY_FEATURES = { transit: [], school: [], life: [], development: [] }
const rows = (districts as { code: string; name: string; nameEng: string }[]).map((d) => ({ ...d, features: EMPTY_FEATURES }))

const inserted = await db.insert(district).values(rows).onConflictDoNothing().returning({ code: district.code })
console.log(`구 ${inserted.length}개 추가 (전체 ${rows.length}개)`)
await closeDb()
