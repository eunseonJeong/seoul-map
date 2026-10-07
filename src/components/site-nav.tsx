"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LockIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/", label: "지도" },
  { href: "/watchlist", label: "관심 단지" },
  { href: "/visits", label: "임장" },
  { href: "/districts", label: "구별 시세" },
]

export function SiteNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function lock() {
    await fetch("/api/unlock", { method: "DELETE" })
    router.replace("/unlock")
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[#fbfbfd]/80 backdrop-blur-xl backdrop-saturate-150">
      <nav className="mx-auto flex h-12 max-w-[1024px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-[7px] bg-foreground text-[11px] font-bold text-background">
            서
          </span>
          <span className="hidden sm:inline">서울 부동산</span>
        </Link>
        <ul className="flex items-center gap-5 text-[13px] sm:gap-8">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "transition-colors",
                    active ? "text-foreground" : "text-foreground/60 hover:text-foreground",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            )
          })}
        </ul>
        <button
          onClick={lock}
          aria-label="잠그기"
          title="잠그기"
          className="grid size-8 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-black/5 hover:text-foreground"
        >
          <LockIcon className="size-4" />
        </button>
      </nav>
    </header>
  )
}
