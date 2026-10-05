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
  population: integer("population"), // 주민등록 인구 (행정안전부), 수집 전에는 null
  populationMonth: char("population_month", { length: 7 }), // 인구 기준월 YYYY-MM
  features: jsonb("features").$type<DistrictFeatures>().notNull(),
  weeklyChange: numeric("weekly_change", { precision: 6, scale: 2, mode: "number" }), // % (R-ONE 주간)
  updatedAt: updatedAt(),
}).enableRLS()

// 구별 월간 3.3㎡당 평균가 (trade 집계, src/lib/ingest/aggregate.ts). 최근가·변동률·전세가율은 여기서 계산한다.
// 거래가 없는 달은 null.
export const districtMonthly = pgTable(
  "district_monthly",
  {
    districtCode: char("district_code", { length: 5 })
      .notNull()
      .references(() => district.code, { onDelete: "cascade" }),
    month: char("month", { length: 7 }).notNull(), // YYYY-MM
    sale: integer("sale"),
    jeonse: integer("jeonse"),
    saleCount: integer("sale_count").notNull().default(0),
    jeonseCount: integer("jeonse_count").notNull().default(0),
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
// 국토교통부 실거래가 API 에서 수집한다. 단지 id 는 API 의 aptSeq (예: 11680-218).
// 세대수·좌표는 실거래 자료에 없어서 비어 있을 수 있다 (공동주택 기본정보·지오코딩으로 채울 예정).

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
    builtYear: smallint("built_year"),
    households: integer("households"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
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
    isCancelled: boolean("is_cancelled").notNull().default(false), // 매매 해제 신고
    isRenewal: boolean("is_renewal").notNull().default(false), // 전세 갱신 계약 (시세 집계에서 뺀다)
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

// 실거래가 수집 기록. 구·월·거래유형 단위로 통째로 다시 받는다.
export const ingestLog = pgTable(
  "ingest_log",
  {
    districtCode: char("district_code", { length: 5 })
      .notNull()
      .references(() => district.code, { onDelete: "cascade" }),
    month: char("month", { length: 7 }).notNull(), // YYYY-MM
    dealType: dealType("deal_type").notNull(),
    rowCount: integer("row_count").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.districtCode, t.month, t.dealType] })],
).enableRLS()

// 구별 생활 인프라 통계 (출처가 있는 숫자만). 텍스트 특징(district.features)은 사용자가 직접 쓴다.
// - 지하철: 서울 열린데이터광장 역사마스터 (역 좌표 → 구 경계로 판정, 환승역은 1개)
// - 학교·학원: 교육부 NEIS 교육정보 개방 포털 (개교한 학교, 개원 상태 학원·교습소)
export const districtStat = pgTable("district_stat", {
  districtCode: char("district_code", { length: 5 })
    .primaryKey()
    .references(() => district.code, { onDelete: "cascade" }),
  subwayStations: integer("subway_stations"),
  subwayLines: jsonb("subway_lines").$type<string[]>(),
  elementarySchools: integer("elementary_schools"),
  middleSchools: integer("middle_schools"),
  highSchools: integer("high_schools"),
  academies: integer("academies"), // 학원
  tutoringCenters: integer("tutoring_centers"), // 교습소
  examAcademies: integer("exam_academies"), // 입시·검정 및 보습 분야 학원+교습소
  transitUpdatedAt: timestamp("transit_updated_at", { withTimezone: true }),
  schoolUpdatedAt: timestamp("school_updated_at", { withTimezone: true }),
}).enableRLS()

// 구별 부동산 관련 기사 (NAVER API HUB 뉴스 검색). 제목·요약·링크만 저장하고 본문은 저장하지 않는다.
export const districtNews = pgTable(
  "district_news",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    districtCode: char("district_code", { length: 5 })
      .notNull()
      .references(() => district.code, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    url: text("url").notNull(), // 언론사 원문 (없으면 네이버 뉴스 링크)
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("district_news_district_url_key").on(t.districtCode, t.url),
    index("district_news_district_published_idx").on(t.districtCode, t.publishedAt),
  ],
).enableRLS()
