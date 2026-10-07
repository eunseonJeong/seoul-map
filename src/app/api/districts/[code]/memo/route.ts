import { NextResponse } from "next/server"
import { districtExists, setDistrictMemo } from "@/lib/api"
import { getUserId } from "@/lib/users"

const unauthorized = () => NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })


export async function PUT(request: Request, ctx: RouteContext<"/api/districts/[code]/memo">) {
  const userId = await getUserId()
  if (!userId) return unauthorized()
  const { code } = await ctx.params
  if (!(await districtExists(code))) return NextResponse.json({ error: "구를 찾을 수 없습니다." }, { status: 404 })
  const b = (await request.json().catch(() => null)) as { memo?: unknown } | null
  const memo = String(b?.memo ?? "").slice(0, 2000)
  await setDistrictMemo(userId, code, memo)
  return NextResponse.json({ memo })
}
