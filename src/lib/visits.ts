// 임장 노트 저장 계층 (visit_note 테이블). API 라우트(src/app/api/visits)와 서버 컴포넌트만 부른다.
import "server-only"

import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { visitNote } from "@/db/schema"
import type { VisitInput, VisitNote } from "./types"

type VisitRow = typeof visitNote.$inferSelect
const toVisit = (r: VisitRow): VisitNote => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
})

export async function listVisits(): Promise<VisitNote[]> {
  const rows = await db.select().from(visitNote).orderBy(desc(visitNote.visitDate), desc(visitNote.createdAt))
  return rows.map(toVisit)
}

export async function createVisit(input: VisitInput): Promise<VisitNote> {
  const [row] = await db.insert(visitNote).values(input).returning()
  return toVisit(row)
}

export async function updateVisit(id: string, input: VisitInput): Promise<VisitNote | null> {
  const [row] = await db.update(visitNote).set(input).where(eq(visitNote.id, id)).returning()
  return row ? toVisit(row) : null
}

export async function deleteVisit(id: string): Promise<boolean> {
  return (await db.delete(visitNote).where(eq(visitNote.id, id)).returning({ id: visitNote.id })).length > 0
}

// ---------- 입력 검증 (DB 연결 후에도 그대로 쓴다) ----------

const TEXT_FIELDS = [
  "location",
  "orientation",
  "parking",
  "maintenance",
  "surroundings",
  "pros",
  "cons",
  "memo",
] as const
const NUMBER_FIELDS = ["area", "askingPrice", "dealPrice", "walkMinutes"] as const

/** 요청 본문을 VisitInput 으로 바꾼다. 잘못된 값이면 사용자에게 보여줄 문구를 돌려준다. */
export function parseVisitInput(body: unknown): { ok: true; value: VisitInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "잘못된 요청입니다." }
  const b = body as Record<string, unknown>

  const visitDate = String(b.visitDate ?? "")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return { ok: false, error: "임장일을 입력하세요." }

  const complexName = String(b.complexName ?? "").trim()
  if (!complexName) return { ok: false, error: "단지명을 입력하세요." }

  const rating = Number(b.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "별점은 1~5 사이입니다." }

  const value = {
    visitDate,
    complexName: complexName.slice(0, 100),
    complexId: typeof b.complexId === "string" && b.complexId ? b.complexId : null,
    rating,
  } as VisitInput

  for (const key of TEXT_FIELDS) value[key] = String(b[key] ?? "").trim().slice(0, 1000)

  for (const key of NUMBER_FIELDS) {
    const raw = b[key]
    if (raw == null || raw === "") {
      value[key] = null
      continue
    }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "숫자 칸에는 0 이상의 숫자만 넣으세요." }
    value[key] = n
  }

  return { ok: true, value }
}
