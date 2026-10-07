import { NextResponse } from "next/server"
import { deleteVisit, parseVisitInput, updateVisit } from "@/lib/visits"

export async function PUT(request: Request, ctx: RouteContext<"/api/visits/[id]">) {
  const { id } = await ctx.params
  const parsed = parseVisitInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const visit = await updateVisit(id, parsed.value)
  if (!visit) return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 })
  return NextResponse.json(visit)
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/visits/[id]">) {
  const { id } = await ctx.params
  if (!(await deleteVisit(id))) return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 })
  return NextResponse.json({ ok: true })
}
