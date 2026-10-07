import { NextResponse } from "next/server"
import { createToken, isAuthConfigured, sessionCookie } from "@/lib/auth"
import { authenticate, clearFailures, clientKey, lockedMinutes, recordFailure } from "@/lib/users"

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "AUTH_SECRET(16자 이상) 환경변수를 설정하세요." }, { status: 500 })
  }
  const key = clientKey(request)
  const minutes = await lockedMinutes(key)
  if (minutes) return NextResponse.json({ error: `잠시 후 다시 시도하세요. (${minutes}분 남음)` }, { status: 429 })

  const b = (await request.json().catch(() => ({}))) as { nickname?: unknown; password?: unknown }
  const user = await authenticate(String(b.nickname ?? "").trim(), String(b.password ?? ""))
  if (!user) {
    const left = await recordFailure(key)
    return left === 0
      ? NextResponse.json({ error: "5회 틀려서 15분간 로그인이 막혔습니다." }, { status: 429 })
      : NextResponse.json({ error: `닉네임 또는 비밀번호가 맞지 않습니다. (${left}회 남음)` }, { status: 401 })
  }

  await clearFailures(key)
  const res = NextResponse.json({ nickname: user.nickname })
  res.cookies.set(sessionCookie(await createToken(user.id)))
  return res
}
