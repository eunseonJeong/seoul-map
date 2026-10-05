import { loadEnvConfig } from "@next/env"
import { defineConfig } from "drizzle-kit"

// Next.js 와 같은 방식으로 .env.local 을 읽는다
loadEnvConfig(process.cwd())

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL 환경변수를 설정하세요.")

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // 마이그레이션은 Session pooler(같은 호스트, 5432)로 실행한다.
  // Transaction pooler(6543)는 마이그레이션의 트랜잭션·prepared statement 와 맞지 않는다.
  dbCredentials: { url: url.replace(":6543/", ":5432/") },
})
