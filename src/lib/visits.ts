// 임장 노트 저장 계층. API 라우트(src/app/api/visits)와 서버 컴포넌트만 부른다.
// 지금은 서버 메모리에 둔 예시 데이터라 서버를 재시작하면 처음 상태로 돌아간다.
// TODO(백엔드 연결): 각 함수 본문을 visit_note 테이블 쿼리로 바꾸면 된다. 시그니처는 그대로 둔다.

import { seedVisits } from "./mock-data"
import type { VisitInput, VisitNote } from "./types"

// 개발 서버 핫 리로드 때 데이터가 날아가지 않도록 globalThis 에 둔다
const store = globalThis as unknown as { __visits?: VisitNote[] }
function table() {
  return (store.__visits ??= seedVisits())
}

const byRecent = (a: VisitNote, b: VisitNote) =>
  b.visitDate.localeCompare(a.visitDate) || b.createdAt.localeCompare(a.createdAt)

export async function listVisits(): Promise<VisitNote[]> {
  return [...table()].sort(byRecent)
}

export async function createVisit(input: VisitInput): Promise<VisitNote> {
  const now = new Date().toISOString()
  const visit: VisitNote = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  table().push(visit)
  return visit
}

export async function updateVisit(id: string, input: VisitInput): Promise<VisitNote | null> {
  const rows = table()
  const i = rows.findIndex((v) => v.id === id)
  if (i < 0) return null
  rows[i] = { ...rows[i], ...input, updatedAt: new Date().toISOString() }
  return rows[i]
}

export async function deleteVisit(id: string): Promise<boolean> {
  const rows = table()
  const i = rows.findIndex((v) => v.id === id)
  if (i < 0) return false
  rows.splice(i, 1)
  return true
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
