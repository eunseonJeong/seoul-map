import { NextResponse } from "next/server"
import { createToken, isAuthConfigured, sessionCookie, timingSafeEqual } from "@/lib/auth"
import { checkNickname, checkPassword, clientKey, createUser, lockedMinutes, recordFailure } from "@/lib/users"

// 가입: 초대 코드(INVITE_CODE)를 아는 사람만
export async function POST(request: Request) {
  const invite = process.env.INVITE_CODE ?? ""
  if (!isAuthConfigured() || !invite) {
    return NextResponse.json({ error: "가입이 열려 있지 않습니다. (AUTH_SECRET, INVITE_CODE 설정 필요)" }, { status: 503 })
  }
  const key = clientKey(request)
  const minutes = await lockedMinutes(key)
  if (minutes) return NextResponse.json({ error: `잠시 후 다시 시도하세요. (${minutes}분 남음)` }, { status: 429 })

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const nickname = String(b.nickname ?? "").trim()
  const password = String(b.password ?? "")

  if (!timingSafeEqual(String(b.inviteCode ?? "").trim(), invite)) {
    // 초대 코드 맞히기를 막으려고 로그인과 같은 횟수 제한을 건다
    const left = await recordFailure(key)
    return NextResponse.json(
      { error: left === 0 ? "5회 틀려서 15분간 막혔습니다." : `초대 코드가 맞지 않습니다. (${left}회 남음)` },
      { status: left === 0 ? 429 : 403 },
    )
  }
  const invalid = checkNickname(nickname) ?? checkPassword(password)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const user = await createUser(nickname, password)
  if (!user) return NextResponse.json({ error: "이미 쓰고 있는 닉네임입니다." }, { status: 409 })

  const res = NextResponse.json({ nickname: user.nickname }, { status: 201 })
  res.cookies.set(sessionCookie(await createToken(user.id)))
  return res
}
