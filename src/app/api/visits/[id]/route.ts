import { NextResponse } from "next/server"
import { getComplex, isUuid } from "@/lib/api"
import { getUserId } from "@/lib/users"
import { deleteVisit, parseVisitInput, updateVisit } from "@/lib/visits"

const unauthorized = () => NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
const notFound = () => NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 })

export async function PUT(request: Request, ctx: RouteContext<"/api/visits/[id]">) {
  const userId = await getUserId()
  if (!userId) return unauthorized()
  const { id } = await ctx.params
  if (!isUuid(id)) return notFound()
  const parsed = parseVisitInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  if (parsed.value.complexId && !(await getComplex(parsed.value.complexId))) parsed.value.complexId = null
  const visit = await updateVisit(userId, id, parsed.value)
  if (!visit) return notFound()
  return NextResponse.json(visit)
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/visits/[id]">) {
  const userId = await getUserId()
  if (!userId) return unauthorized()
  const { id } = await ctx.params
  if (!isUuid(id) || !(await deleteVisit(userId, id))) return notFound()
  return NextResponse.json({ ok: true })
}
