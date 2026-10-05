import { NextResponse } from "next/server"
import { createVisit, listVisits, parseVisitInput } from "@/lib/visits"

// 비밀번호 확인은 src/proxy.ts 가 처리한다 (통과 못 하면 401)

export async function GET() {
  return NextResponse.json(await listVisits())
}

export async function POST(request: Request) {
  const parsed = parseVisitInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  return NextResponse.json(await createVisit(parsed.value), { status: 201 })
}
