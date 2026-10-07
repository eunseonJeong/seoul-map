import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE, verifyToken } from "@/lib/auth"

// 로그인하지 않은 요청은 페이지면 /login 으로, API 면 401 로 돌려보낸다
export async function proxy(request: NextRequest) {
  if (await verifyToken(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next()

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "login required" }, { status: 401 })
  }
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.search = ""
  const next = request.nextUrl.pathname + request.nextUrl.search
  if (next !== "/") url.searchParams.set("next", next)
  return NextResponse.redirect(url)
}

export const config = {
  // 로그인·가입 화면과 인증 API, cron(자체 비밀값으로 확인), 정적 이미지(로고·파비콘)는 통과시킨다
  matcher: ["/((?!login|signup|api/auth|api/cron|_next/static|_next/image|favicon.ico|modoobudongsan_favicon.ico|logo/).*)"],
}
