"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"
import type { Complex, District } from "@/lib/types"

export function ComplexSearch({ complexes, districts }: { complexes: Complex[]; districts: District[] }) {
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const guName = useMemo(() => new Map(districts.map((d) => [d.code, d.name])), [districts])

  const results = useMemo(() => {
    const s = q.trim()
    if (!s) return []
    return complexes
      .filter((c) => c.name.includes(s) || c.dong.includes(s) || guName.get(c.districtCode)?.includes(s))
      .slice(0, 8)
  }, [q, complexes, guName])

  return (
    <div className="relative w-full sm:w-72">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="단지·동 검색"
        aria-label="단지 검색"
        className="h-10 w-full rounded-full bg-black/[0.06] pr-4 pl-10 text-[14px] outline-none placeholder:text-muted-foreground focus:bg-white focus:ring-4 focus:ring-primary/15"
      />
      {open && q.trim() && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-muted-foreground">검색 결과가 없습니다.</p>
          ) : (
            <ul>
              {results.map((c) => (
                <li key={c.id}>
                  <Link href={`/complex/${c.id}`} className="block px-4 py-2.5 text-[14px] hover:bg-muted">
                    {c.name}
                    <span className="ml-2 text-[12px] text-muted-foreground">
                      {guName.get(c.districtCode)} {c.dong}
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
