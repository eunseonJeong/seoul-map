import { NextResponse, type NextRequest } from "next/server"
import { searchComplexes } from "@/lib/api"

// 단지 검색: /api/complexes?q=은마
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 50)
  return NextResponse.json(await searchComplexes(q))
}
