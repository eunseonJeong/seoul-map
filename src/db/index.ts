// DB 클라이언트. 서버(서버 컴포넌트, route handler)에서만 import 한다.
import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL 환경변수를 설정하세요. (.env.example 참고)")

// Supabase Transaction pooler(6543)는 prepared statement 를 지원하지 않는다 → prepare: false
// 개발 서버 핫 리로드 때 커넥션이 쌓이지 않도록 globalThis 에 둔다
const store = globalThis as unknown as { __pg?: postgres.Sql }
const client = (store.__pg ??= postgres(url, { prepare: false, max: 5 }))

export const db = drizzle(client, { schema })
export { schema }
