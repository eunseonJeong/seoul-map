import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE, verifyToken } from "@/lib/auth"

// 비밀번호를 통과하지 않은 요청은 페이지든 API든 /unlock 으로 돌려보낸다
export async function proxy(request: NextRequest) {
  const ok = await verifyToken(request.cookies.get(AUTH_COOKIE)?.value)
  if (ok) return NextResponse.next()

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "locked" }, { status: 401 })
  }
  const url = request.nextUrl.clone()
  url.pathname = "/unlock"
  url.search = ""
  const next = request.nextUrl.pathname + request.nextUrl.search
  if (next !== "/") url.searchParams.set("next", next)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!unlock|api/unlock|_next/static|_next/image|favicon.ico).*)"],
}
