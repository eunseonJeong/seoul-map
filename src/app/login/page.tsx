import { Suspense } from "react"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "./login-form"

export const metadata = { title: "로그인 · 서울 부동산" }

export default function LoginPage() {
  return (
    <AuthShell
      title="로그인"
      subtitle="닉네임과 비밀번호를 입력하세요."
      footer={{ text: "처음이신가요?", href: "/signup", label: "초대 코드로 가입하기" }}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
