import { NextResponse } from "next/server"
import { addWatch, getComplex, listWatchlist } from "@/lib/api"
import { getUserId } from "@/lib/users"

const unauthorized = () => NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })


export async function GET() {
  const userId = await getUserId()
  if (!userId) return unauthorized()
  return NextResponse.json(await listWatchlist(userId))
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return unauthorized()
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const complexId = typeof b?.complexId === "string" ? b.complexId : ""
  const area = Number(b?.area)
  const price = (v: unknown) => (v == null ? null : Number.isInteger(v) && (v as number) > 0 ? (v as number) : NaN)
  const baseSalePrice = price(b?.baseSalePrice)
  const baseJeonsePrice = price(b?.baseJeonsePrice)
  const baseDate = String(b?.baseDate ?? "")

  if (!Number.isInteger(area) || area <= 0 || Number.isNaN(baseSalePrice) || Number.isNaN(baseJeonsePrice) || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
  const complex = complexId ? await getComplex(complexId) : undefined
  if (!complex || !complex.areas.includes(area)) {
    return NextResponse.json({ error: "단지 또는 면적을 찾을 수 없습니다." }, { status: 404 })
  }
  const memo = String(b?.memo ?? "").trim().slice(0, 1000)
  return NextResponse.json(await addWatch(userId, { complexId, area, baseSalePrice, baseJeonsePrice, baseDate, memo }), { status: 201 })
}
