"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { SearchIcon } from "lucide-react"

type Result = { id: string; name: string; dong: string; guName: string }

// 단지가 9천 개가 넘어서 서버(/api/complexes)에서 검색한다
export function ComplexSearch() {
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)

  useEffect(() => {
    const s = q.trim()
    if (!s) return
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/complexes?q=${encodeURIComponent(s)}`, { signal: ctrl.signal })
        if (res.ok) setResults(await res.json())
      } catch {
        // 입력이 바뀌어 취소된 요청
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [q])

  return (
    <div className="relative w-full sm:w-72">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setResults(null)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="단지·동 검색"
        aria-label="단지 검색"
        className="h-10 w-full rounded-full bg-foreground/[0.06] pr-4 pl-10 text-[14px] outline-none placeholder:text-muted-foreground focus:bg-popover focus:ring-4 focus:ring-primary/15"
      />
      {open && q.trim() && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-popover shadow-xl ring-1 ring-foreground/5">
          {results === null ? (
            <p className="px-4 py-3 text-[13px] text-muted-foreground">찾는 중…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-muted-foreground">검색 결과가 없습니다.</p>
          ) : (
            <ul>
              {results.map((c) => (
                <li key={c.id}>
                  <Link href={`/complex/${c.id}`} className="block px-4 py-2.5 text-[14px] hover:bg-muted">
                    {c.name}
                    <span className="ml-2 text-[12px] text-muted-foreground">
                      {c.guName} {c.dong}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
