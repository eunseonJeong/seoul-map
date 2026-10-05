import { NextResponse } from "next/server"
import { isUuid, removeWatch, updateWatchMemo } from "@/lib/api"

const notFound = () => NextResponse.json({ error: "관심 단지를 찾을 수 없습니다." }, { status: 404 })

// 메모 수정
export async function PATCH(request: Request, ctx: RouteContext<"/api/watchlist/[id]">) {
  const { id } = await ctx.params
  if (!isUuid(id)) return notFound()
  const b = (await request.json().catch(() => null)) as { memo?: unknown } | null
  const item = await updateWatchMemo(id, String(b?.memo ?? "").trim().slice(0, 1000))
  return item ? NextResponse.json(item) : notFound()
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/watchlist/[id]">) {
  const { id } = await ctx.params
  if (!isUuid(id) || !(await removeWatch(id))) return notFound()
  return NextResponse.json({ ok: true })
}
