// DB 클라이언트. 서버(서버 컴포넌트, route handler)에서만 import 한다.
import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL 환경변수를 설정하세요. (.env.example 참고)")

// Supabase Transaction pooler(6543)는 prepared statement 를 지원하지 않는다 → prepare: false
// pooler 가 오래 쉰 연결을 조용히 끊으면 그 연결로 보낸 쿼리가 끝없이 기다린다.
// 쉬는 연결은 먼저 닫고(idle_timeout), 오래된 연결은 갈아 끼우고(max_lifetime), 접속은 10초 안에 포기한다.
// 개발 서버 핫 리로드 때 커넥션이 쌓이지 않도록 globalThis 에 둔다
const store = globalThis as unknown as { __pgPool?: postgres.Sql }
const client = (store.__pgPool ??= postgres(url, {
  prepare: false,
  max: 5,
  idle_timeout: 20,
  max_lifetime: 60 * 10,
  connect_timeout: 10,
}))

export const db = drizzle(client, { schema })
export { schema }
