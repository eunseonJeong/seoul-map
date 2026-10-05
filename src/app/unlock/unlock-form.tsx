"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"

export function UnlockForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [shake, setShake] = useState(0)

  async function submit(value: string) {
    setPending(true)
    setError(null)
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: value }),
    })
    if (res.ok) {
      const next = params.get("next")
      // 같은 사이트 경로로만 돌려보낸다
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/")
      router.refresh()
      return
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    setError(data.error ?? "다시 시도하세요.")
    setPin("")
    setShake((n) => n + 1)
    setPending(false)
  }

  return (
    <div className="mt-10 flex flex-col items-center gap-5">
      <div key={shake} className={cn(shake > 0 && "animate-[shake_0.4s_ease-in-out]")}>
        <InputOTP
          maxLength={4}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoFocus
          value={pin}
          disabled={pending}
          onChange={setPin}
          onComplete={submit}
          aria-label="비밀번호 4자리"
        >
          <InputOTPGroup className="gap-3">
            {[0, 1, 2, 3].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="size-14 rounded-2xl border bg-background text-2xl font-semibold shadow-sm first:rounded-2xl last:rounded-2xl data-[active=true]:ring-4 data-[active=true]:ring-primary/20"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <p role="alert" className={cn("min-h-5 text-[14px]", error ? "text-destructive" : "text-transparent")}>
        {error ?? "·"}
      </p>
    </div>
  )
}
