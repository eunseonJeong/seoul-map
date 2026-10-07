// 사용자 가입·로그인과 로그인 시도 제한. route handler 와 서버 컴포넌트만 부른다.
import "server-only"

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { appUser, unlockAttempt, visitNote, watchlist } from "@/db/schema"
import { AUTH_COOKIE, verifyToken } from "./auth"

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>

// ---------- 입력 규칙 ----------

export function checkNickname(nickname: string): string | null {
  if (nickname.length < 2 || nickname.length > 16) return "닉네임은 2~16자로 정하세요."
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) return "닉네임은 한글·영문·숫자·언더바(_)만 쓸 수 있습니다."
  return null
}

export function checkPassword(password: string): string | null {
  if (password.length < 8 || password.length > 72) return "비밀번호는 8~72자로 정하세요."
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "비밀번호에 영문과 숫자를 모두 넣으세요."
  return null
}

// ---------- 비밀번호 해시 (scrypt) ----------

async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$")
  if (scheme !== "scrypt" || !salt || !hash) return false
  const expected = Buffer.from(hash, "base64")
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length)
  return timingSafeEqual(actual, expected)
}

// ---------- 사용자 ----------

export async function isNicknameTaken(nickname: string) {
  const [row] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(sql`lower(${appUser.nickname}) = lower(${nickname})`)
  return Boolean(row)
}

/** 가입. 닉네임이 이미 있으면 null. 첫 가입자는 주인 없는 기존 기록(관심 단지·임장 노트)을 넘겨받는다. */
export async function createUser(nickname: string, password: string) {
  const passwordHash = await hashPassword(password)
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(appUser)
      .values({ nickname, passwordHash })
      .onConflictDoNothing()
      .returning({ id: appUser.id, nickname: appUser.nickname })
    if (!user) return null
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(appUser)
    if (count === 1) {
      await tx.update(watchlist).set({ userId: user.id }).where(isNull(watchlist.userId))
      await tx.update(visitNote).set({ userId: user.id }).where(isNull(visitNote.userId))
    }
    return user
  })
}

/** 닉네임·비밀번호가 맞으면 사용자 */
export async function authenticate(nickname: string, password: string) {
  const [user] = await db.select().from(appUser).where(sql`lower(${appUser.nickname}) = lower(${nickname})`)
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null
  return { id: user.id, nickname: user.nickname }
}

// ---------- 세션 ----------

/** 로그인한 사용자 id (route handler 에서는 없으면 401) */
export async function getUserId() {
  return verifyToken((await cookies()).get(AUTH_COOKIE)?.value)
}

/** 서버 컴포넌트용: 로그인하지 않았으면 로그인 화면으로 보낸다 */
export const requireUser = cache(async () => {
  const id = await getUserId()
  const [user] = id ? await db.select({ id: appUser.id, nickname: appUser.nickname }).from(appUser).where(eq(appUser.id, id)) : []
  if (!user) redirect("/login")
  return user
})

// ---------- 시도 제한: 접속 IP 별 5회 실패 → 15분 잠금 ----------

const MAX_FAILS = 5
const LOCK_MS = 15 * 60 * 1000

export function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"
}

/** 잠겨 있으면 남은 분, 아니면 0 */
export async function lockedMinutes(key: string) {
  const [row] = await db.select().from(unlockAttempt).where(eq(unlockAttempt.clientKey, key))
  const left = row?.lockedUntil ? row.lockedUntil.getTime() - Date.now() : 0
  return left > 0 ? Math.ceil(left / 60000) : 0
}

/** 실패를 기록한다. 남은 횟수(0 이면 방금 잠김)를 돌려준다 */
export async function recordFailure(key: string) {
  const [row] = await db
    .insert(unlockAttempt)
    .values({ clientKey: key, fails: 1 })
    .onConflictDoUpdate({
      target: unlockAttempt.clientKey,
      // 잠금이 풀린 뒤 다시 틀리면 1회부터 센다
      set: {
        fails: sql`case when ${unlockAttempt.lockedUntil} is not null and ${unlockAttempt.lockedUntil} <= now() then 1 else ${unlockAttempt.fails} + 1 end`,
        lockedUntil: sql`case when ${unlockAttempt.lockedUntil} <= now() then null else ${unlockAttempt.lockedUntil} end`,
      },
    })
    .returning({ fails: unlockAttempt.fails })
  if (row.fails >= MAX_FAILS) {
    await db
      .update(unlockAttempt)
      .set({ fails: 0, lockedUntil: new Date(Date.now() + LOCK_MS) })
      .where(eq(unlockAttempt.clientKey, key))
    return 0
  }
  return MAX_FAILS - row.fails
}

export async function clearFailures(key: string) {
  await db.delete(unlockAttempt).where(eq(unlockAttempt.clientKey, key))
}
