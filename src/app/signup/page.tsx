import { Suspense } from "react"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignupForm } from "./signup-form"

export const metadata = { title: "가입 · 서울 부동산" }

export default function SignupPage() {
  return (
    <AuthShell
      title="가입"
      subtitle="초대 코드를 받은 분만 가입할 수 있습니다."
      footer={{ text: "이미 가입했나요?", href: "/login", label: "로그인" }}
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  )
}
