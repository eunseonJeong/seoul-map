// 로그인 세션 쿠키. 값 = "<사용자 id>.<만료 시각>.<HMAC 서명>"
// AUTH_SECRET 을 바꾸면 모든 세션이 끊긴다.
// proxy 와 route handler 양쪽에서 쓰도록 Web Crypto 만 사용한다.

export const AUTH_COOKIE = "sre_session"
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30 // 30일

async function hmac(message: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(process.env.AUTH_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function createToken(userId: string) {
  const expires = Date.now() + AUTH_MAX_AGE * 1000
  return `${userId}.${expires}.${await hmac(`${userId}.${expires}`)}`
}

/** 서명이 맞고 만료 전이면 사용자 id, 아니면 null */
export async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!token || !isAuthConfigured()) return null
  const [userId, expires, sig] = token.split(".")
  if (!userId || !expires || !sig || Number(expires) < Date.now()) return null
  return timingSafeEqual(sig, await hmac(`${userId}.${expires}`)) ? userId : null
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function isAuthConfigured() {
  return (process.env.AUTH_SECRET ?? "").length >= 16
}

export const sessionCookie = (value: string) => ({
  name: AUTH_COOKIE,
  value,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: AUTH_MAX_AGE,
})
