// 4자리 접속 비밀번호 (기획서 '접속 비밀번호 구현')
// 쿠키 값 = "<만료 시각>.<HMAC 서명>". 비밀번호를 바꾸면 기존 쿠키는 모두 무효가 된다.
// proxy(엣지)와 route handler 양쪽에서 쓰도록 Web Crypto 만 사용한다.

export const AUTH_COOKIE = "sre_auth"
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30 // 30일

function secretKey() {
  const pin = process.env.SITE_PIN ?? ""
  const secret = process.env.AUTH_SECRET ?? ""
  return `${secret}:${pin}`
}

async function hmac(message: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function createToken() {
  const expires = Date.now() + AUTH_MAX_AGE * 1000
  return `${expires}.${await hmac(String(expires))}`
}

export async function verifyToken(token: string | undefined) {
  if (!token) return false
  const [expires, sig] = token.split(".")
  if (!expires || !sig || Number(expires) < Date.now()) return false
  return timingSafeEqual(sig, await hmac(expires))
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function isAuthConfigured() {
  return /^\d{4}$/.test(process.env.SITE_PIN ?? "") && (process.env.AUTH_SECRET ?? "").length >= 16
}
