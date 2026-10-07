"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, safeNext } from "@/components/auth/auth-shell"

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [nickname, setNickname] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, password }),
    })
    if (res.ok) {
      router.replace(safeNext(params.get("next")))
      router.refresh()
      return
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    setError(data.error ?? "다시 시도하세요.")
    setPassword("")
    setPending(false)
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="닉네임">
        <Input autoFocus autoComplete="username" required value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </Field>
      <Field label="비밀번호">
        <Input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <p role="alert" className="min-h-5 text-[14px] text-destructive">
        {error}
      </p>
      <Button type="submit" disabled={pending} className="h-11 text-[15px]">
        로그인
      </Button>
    </form>
  )
}
