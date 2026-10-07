"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, safeNext } from "@/components/auth/auth-shell"
import { PasswordInput } from "@/components/auth/password-input"

type NicknameState = { status: "idle" | "checking" } | { status: "ok" } | { status: "error"; message: string }

export function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [nickname, setNickname] = useState("")
  const [nicknameState, setNicknameState] = useState<NicknameState>({ status: "idle" })
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // 닉네임 중복 확인 (입력을 멈추면 확인)
  useEffect(() => {
    const value = nickname.trim()
    if (!value) return
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/nickname?value=${encodeURIComponent(value)}`, {
          // 서버가 답하지 않으면 '확인 중'에 멈춰 있지 않도록 10초 뒤 포기한다
          signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(10_000)]),
        })
        const data = (await res.json()) as { available: boolean; error?: string }
        setNicknameState(data.available ? { status: "ok" } : { status: "error", message: data.error ?? "쓸 수 없는 닉네임입니다." })
      } catch {
        // 입력이 바뀌어 취소된 요청은 무시
        if (ctrl.signal.aborted) return
        setNicknameState({ status: "error", message: "닉네임을 확인하지 못했습니다. 잠시 후 다시 입력해 보세요." })
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [nickname])

  const passwordError =
    password && (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password))
      ? "영문과 숫자를 섞어 8자 이상으로 정하세요."
      : null
  const confirmError = confirm && confirm !== password ? "비밀번호가 서로 다릅니다." : null
  const ready = nicknameState.status === "ok" && password && !passwordError && confirm === password && inviteCode.trim()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setPending(true)
    setError(null)
    let res: Response
    try {
      res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), password, inviteCode }),
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      // 서버가 꺼져 있거나 답하지 않으면 버튼이 '진행 중'에 멈추지 않게 풀어 준다
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.")
      setPending(false)
      return
    }
    if (res.ok) {
      router.replace(safeNext(params.get("next")))
      router.refresh()
      return
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    setError(data.error ?? "다시 시도하세요.")
    if (res.status === 409) setNicknameState({ status: "error", message: data.error ?? "이미 사용 중인 닉네임입니다." })
    setPending(false)
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field
        label="닉네임"
        hint={
          nicknameState.status === "ok" ? (
            <span className="text-success">사용 가능한 닉네임입니다.</span>
          ) : nicknameState.status === "checking" ? (
            <span className="text-muted-foreground">확인하는 중…</span>
          ) : nicknameState.status === "error" ? (
            <span className="text-destructive">{nicknameState.message}</span>
          ) : (
            <span className="text-muted-foreground">한글·영문·숫자·언더바(_), 2~16자</span>
          )
        }
      >
        <Input
          autoFocus
          autoComplete="username"
          required
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value)
            setNicknameState({ status: e.target.value.trim() ? "checking" : "idle" })
          }}
        />
      </Field>
      <Field
        label="비밀번호"
        hint={<span className={passwordError ? "text-destructive" : "text-muted-foreground"}>{passwordError ?? "영문과 숫자를 섞어 8자 이상"}</span>}
      >
        <PasswordInput autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="비밀번호 확인" hint={confirmError && <span className="text-destructive">{confirmError}</span>}>
        <PasswordInput autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Field label="초대 코드">
        <Input autoComplete="off" required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
      </Field>
      <p role="alert" className="min-h-5 text-[14px] text-destructive">
        {error}
      </p>
      <Button type="submit" disabled={!ready || pending} className="h-11 text-[15px]">
        가입하기
      </Button>
    </form>
  )
}
