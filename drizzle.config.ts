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
  // Session pooler(5432). 예전 Transaction pooler(6543) 주소가 들어 있어도 5432 로 바꿔 쓴다
  dbCredentials: { url: url.replace(":6543/", ":5432/") },
})
