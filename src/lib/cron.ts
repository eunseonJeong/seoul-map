// Vercel Cron 요청 확인: Vercel 이 Authorization: Bearer <CRON_SECRET> 을 붙여 보낸다.
import "server-only"

import { timingSafeEqual } from "./auth"

export function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && timingSafeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)
}

/** 단계마다 따로 실행하고 결과를 모은다. 한 단계가 실패해도 다음 단계는 돈다 */
export async function runSteps(steps: Record<string, () => Promise<unknown>>) {
  const results: Record<string, { ok: boolean; ms: number; result?: unknown; error?: string }> = {}
  for (const [name, run] of Object.entries(steps)) {
    const started = Date.now()
    try {
      results[name] = { ok: true, ms: Date.now() - started, result: await run() }
      results[name].ms = Date.now() - started
    } catch (e) {
      results[name] = { ok: false, ms: Date.now() - started, error: (e as Error).message }
      console.error(`[cron] ${name} 실패:`, e)
    }
  }
  return { ok: Object.values(results).every((r) => r.ok), results }
}
