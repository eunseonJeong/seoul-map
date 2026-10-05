import { NextResponse } from "next/server"
import { getDistrict, setDistrictMemo } from "@/lib/api"

export async function PUT(request: Request, ctx: RouteContext<"/api/districts/[code]/memo">) {
  const { code } = await ctx.params
  if (!(await getDistrict(code))) return NextResponse.json({ error: "구를 찾을 수 없습니다." }, { status: 404 })
  const b = (await request.json().catch(() => null)) as { memo?: unknown } | null
  const memo = String(b?.memo ?? "").slice(0, 2000)
  await setDistrictMemo(code, memo)
  return NextResponse.json({ memo })
}
