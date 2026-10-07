import { NextResponse } from "next/server"
import { getComplex } from "@/lib/api"
import { getUserId } from "@/lib/users"
import { createVisit, listVisits, parseVisitInput } from "@/lib/visits"

const unauthorized = () => NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })


// 비밀번호 확인은 src/proxy.ts 가 처리한다 (통과 못 하면 401)

export async function GET() {
  const userId = await getUserId()
  if (!userId) return unauthorized()
  return NextResponse.json(await listVisits(userId))
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return unauthorized()
  const parsed = parseVisitInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  if (parsed.value.complexId && !(await getComplex(parsed.value.complexId))) parsed.value.complexId = null
  return NextResponse.json(await createVisit(userId, parsed.value), { status: 201 })
}
