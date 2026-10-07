// 스크립트용 DB 연결. src/db/index.ts 는 server-only 라 Next 밖에서는 쓸 수 없다.
import { loadEnvConfig } from "@next/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "@/db/schema"

loadEnvConfig(process.cwd())

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL 환경변수를 설정하세요.")

const client = postgres(url, { prepare: false, max: 4, idle_timeout: 20, connect_timeout: 10 })
export const db = drizzle(client, { schema })
export const closeDb = () => client.end()
