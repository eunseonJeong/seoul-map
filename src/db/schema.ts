// DB 스키마. 컬럼은 src/lib/types.ts 의 타입을 기준으로 한다.
// 가격은 만원(integer), 면적은 전용 ㎡(numeric 6,2), 월은 'YYYY-MM' 문자열.
// 모든 테이블에 RLS 를 켜고 정책은 두지 않는다 → Supabase Data API(anon key)로는 접근 불가,
// 서버의 직접 연결(postgres 역할)만 읽고 쓴다.

import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  char,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import type { DistrictFeatures } from "@/lib/types"

const area = (name: string) => numeric(name, { precision: 6, scale: 2, mode: "number" })
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())

// ---------- 구 ----------

export const district = pgTable("district", {
  code: char("code", { length: 5 }).primaryKey(), // 법정동 시군구 코드 (예: 11680)
  name: text("name").notNull(),
  nameEng: text("name_eng").notNull(),
  summary: text("summary").notNull().default(""),
  population: integer("population").notNull(),
  features: jsonb("features").$type<DistrictFeatures>().notNull(),
  weeklyChange: numeric("weekly_change", { precision: 6, scale: 2, mode: "number" }), // % (R-ONE 주간)
  updatedAt: updatedAt(),
}).enableRLS()

// 구별 월간 3.3㎡당 평균가. 최근가·변동률·전세가율은 여기서 계산한다.
export const districtMonthly = pgTable(
  "district_monthly",
  {
    districtCode: char("district_code", { length: 5 })
      .notNull()
      .references(() => district.code, { onDelete: "cascade" }),
    month: char("month", { length: 7 }).notNull(), // YYYY-MM
    sale: integer("sale").notNull(),
    jeonse: integer("jeonse").notNull(),
  },
  (t) => [primaryKey({ columns: [t.districtCode, t.month] })],
).enableRLS()

// 사용자가 남기는 구 메모
export const regionFeature = pgTable("region_feature", {
  districtCode: char("district_code", { length: 5 })
    .primaryKey()
    .references(() => district.code, { onDelete: "cascade" }),
  memo: text("memo").notNull().default(""),
  updatedAt: updatedAt(),
}).enableRLS()

// ---------- 단지 · 거래 ----------

export const complex = pgTable(
  "complex",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    districtCode: char("district_code", { length: 5 })
      .notNull()
      .references(() => district.code),
    dong: text("dong").notNull(),
    address: text("address").notNull(),
    builtYear: smallint("built_year").notNull(),
    households: integer("households").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
  },
  (t) => [index("complex_district_idx").on(t.districtCode)],
).enableRLS()

export const complexArea = pgTable(
  "complex_area",
  {
    complexId: text("complex_id")
      .notNull()
      .references(() => complex.id, { onDelete: "cascade" }),
    area: area("area").notNull(),
  },
  (t) => [primaryKey({ columns: [t.complexId, t.area] })],
).enableRLS()

export const dealType = pgEnum("deal_type", ["sale", "jeonse"])

export const trade = pgTable(
  "trade",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    complexId: text("complex_id")
      .notNull()
      .references(() => complex.id, { onDelete: "cascade" }),
    dealType: dealType("deal_type").notNull(),
    area: area("area").notNull(),
    floor: smallint("floor").notNull(),
    price: integer("price").notNull(), // 매매가 또는 전세 보증금, 만원
    contractDate: date("contract_date", { mode: "string" }).notNull(),
    isCancelled: boolean("is_cancelled").notNull().default(false),
  },
  (t) => [index("trade_complex_area_date_idx").on(t.complexId, t.area, t.contractDate)],
).enableRLS()

// ---------- 사용자 데이터 ----------

export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    complexId: text("complex_id")
      .notNull()
      .references(() => complex.id, { onDelete: "cascade" }),
    area: area("area").notNull(),
    baseSalePrice: integer("base_sale_price"),
    baseJeonsePrice: integer("base_jeonse_price"),
    baseDate: date("base_date", { mode: "string" }).notNull(),
    memo: text("memo").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [unique("watchlist_complex_area_key").on(t.complexId, t.area)],
).enableRLS()

export const visitNote = pgTable(
  "visit_note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitDate: date("visit_date", { mode: "string" }).notNull(),
    complexId: text("complex_id").references(() => complex.id, { onDelete: "set null" }),
    complexName: text("complex_name").notNull(),
    location: text("location").notNull().default(""),
    area: area("area"),
    askingPrice: integer("asking_price"),
    dealPrice: integer("deal_price"),
    walkMinutes: smallint("walk_minutes"),
    orientation: text("orientation").notNull().default(""),
    parking: text("parking").notNull().default(""),
    maintenance: text("maintenance").notNull().default(""),
    surroundings: text("surroundings").notNull().default(""),
    pros: text("pros").notNull().default(""),
    cons: text("cons").notNull().default(""),
    rating: smallint("rating").notNull(),
    memo: text("memo").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("visit_note_rating_check", sql`${t.rating} between 1 and 5`),
    index("visit_note_visit_date_idx").on(t.visitDate),
  ],
).enableRLS()

// 접속 비밀번호 실패 횟수 (5회 틀리면 15분 잠금)
export const unlockAttempt = pgTable("unlock_attempt", {
  clientKey: text("client_key").primaryKey(),
  fails: smallint("fails").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: updatedAt(),
}).enableRLS()
