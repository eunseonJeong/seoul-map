import { NextResponse } from "next/server"
import { updateDistrictProfile } from "@/lib/api"
import { getUserId } from "@/lib/users"
import type { DistrictFeatures } from "@/lib/types"

const KEYS = ["transit", "school", "life", "development"] as const

// 구 소개·특징 (사용자가 직접 쓴다)
export async function PUT(request: Request, ctx: RouteContext<"/api/districts/[code]">) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  const { code } = await ctx.params
  const b = (await request.json().catch(() => null)) as { summary?: unknown; features?: Record<string, unknown> } | null
  if (!b) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })

  const features = Object.fromEntries(
    KEYS.map((k) => {
      const list = Array.isArray(b.features?.[k]) ? (b.features[k] as unknown[]) : []
      return [k, list.map((v) => String(v).trim().slice(0, 100)).filter(Boolean).slice(0, 10)]
    }),
  ) as unknown as DistrictFeatures
  const summary = String(b.summary ?? "").trim().slice(0, 200)

  if (!(await updateDistrictProfile(userId, code, { summary, features }))) {
    return NextResponse.json({ error: "구를 찾을 수 없습니다." }, { status: 404 })
  }
  return NextResponse.json({ summary, features })
}
