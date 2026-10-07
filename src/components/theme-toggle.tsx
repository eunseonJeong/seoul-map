"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"

const noop = () => () => {}

/** 라이트 ↔ 다크 전환 (처음엔 라이트) */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // 테마는 브라우저에서만 알 수 있으니, 서버 렌더에서는 자리만 잡아 둔다
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  const dark = mounted && resolvedTheme === "dark"
  const label = dark ? "라이트 모드로 바꾸기" : "다크 모드로 바꾸기"
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      {!mounted ? <span className="size-4" /> : dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </button>
  )
}
