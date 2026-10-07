"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** 눈 아이콘을 누르면 입력한 비밀번호를 보여 주는 입력칸 */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOffIcon : EyeIcon
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
      >
        <Icon className="size-4" />
      </button>
    </div>
  )
}
