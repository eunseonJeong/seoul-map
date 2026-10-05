import { NextResponse, type NextRequest } from "next/server"
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE,
  createToken,
  isAuthConfigured,
  timingSafeEqual,
} from "@/lib/auth"

// 5회 틀리면 15분 잠금. 메모리에 두므로 서버가 여러 대이거나 재시작되면 초기화된다.
// TODO(백엔드 연결): 시도 횟수를 DB나 KV 에 저장
const MAX_FAILS = 5
const LOCK_MS = 15 * 60 * 1000
const attempts = new Map<string, { fails: number; lockedUntil: number }>()

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"
}

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "SITE_PIN(숫자 4자리)과 AUTH_SECRET(16자 이상) 환경변수를 설정하세요." },
      { status: 500 },
    )
  }

  const key = clientKey(request)
  const now = Date.now()
  const state = attempts.get(key) ?? { fails: 0, lockedUntil: 0 }

  if (state.lockedUntil > now) {
    const minutes = Math.ceil((state.lockedUntil - now) / 60000)
    return NextResponse.json({ error: `잠시 후 다시 시도하세요. (${minutes}분 남음)` }, { status: 429 })
  }

  const body = (await request.json().catch(() => ({}))) as { pin?: string }
  const pin = String(body.pin ?? "")

  if (!timingSafeEqual(pin, process.env.SITE_PIN!)) {
    state.fails += 1
    if (state.fails >= MAX_FAILS) {
      state.fails = 0
      state.lockedUntil = now + LOCK_MS
      attempts.set(key, state)
      return NextResponse.json({ error: "5회 틀려서 15분간 입력이 막혔습니다." }, { status: 429 })
    }
    attempts.set(key, state)
    return NextResponse.json(
      { error: `비밀번호가 틀렸습니다. (${MAX_FAILS - state.fails}회 남음)` },
      { status: 401 },
    )
  }

  attempts.delete(key)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, await createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  })
  return res
}

// 잠그기 (쿠키 삭제)
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(AUTH_COOKIE)
  return res
}
