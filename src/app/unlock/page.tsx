import { Suspense } from "react"
import { UnlockForm } from "./unlock-form"

export const metadata = { title: "잠금 해제 · 서울 부동산" }

export default function UnlockPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-muted px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-[16px] bg-foreground text-xl font-bold text-background">
          서
        </span>
        <h1 className="text-[32px] font-semibold leading-tight">잠금 해제</h1>
        <p className="mt-2 text-[17px] text-muted-foreground">비밀번호 4자리를 입력하세요.</p>
        <Suspense>
          <UnlockForm />
        </Suspense>
      </div>
    </main>
  )
}
