"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRightIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Change, ChangePill } from "@/components/change"
import { motion } from "motion/react"
import { CountUp, Reveal, TiltCard } from "@/components/motion"
import { Segmented } from "@/components/segmented"
import { areaLabel, changePct, formatPrice } from "@/lib/format"
import { useRouter } from "next/navigation"
import { useWatchlist } from "@/lib/watchlist-store"
import { cn } from "@/lib/utils"
import type { Complex, DealType, District, WatchItem } from "@/lib/types"

export type PriceSnapshot = {
  sale: { price: number; month: string } | null
  jeonse: { price: number; month: string } | null
  trend: (number | null)[]
}

type Sort = "up" | "down" | "recent"

export function WatchlistView({
  initialItems,
  complexes,
  districts,
  prices,
}: {
  initialItems: WatchItem[]
  complexes: Complex[]
  districts: District[]
  prices: Record<string, PriceSnapshot>
}) {
  const { items, add, remove, updateMemo } = useWatchlist(initialItems)
  const router = useRouter()
  const [dealType, setDealType] = useState<DealType>("sale")
  const [sort, setSort] = useState<Sort>("up")

  const rows = useMemo(() => {
    const complexById = new Map(complexes.map((c) => [c.id, c]))
    const guByCode = new Map(districts.map((d) => [d.code, d.name]))
    const list = items.flatMap((w) => {
      const complex = complexById.get(w.complexId)
      if (!complex) return []
      const snap = prices[`${w.complexId}-${w.area}`]
      const current = dealType === "sale" ? snap?.sale : snap?.jeonse
      const base = dealType === "sale" ? w.baseSalePrice : w.baseJeonsePrice
      return [{ w, complex, gu: guByCode.get(complex.districtCode) ?? "", snap, current, base, change: changePct(current?.price, base) }]
    })
    return list.sort((a, b) => {
      if (sort === "recent") return b.w.createdAt.localeCompare(a.w.createdAt)
      const av = a.change ?? -Infinity
      const bv = b.change ?? -Infinity
      return sort === "up" ? bv - av : av - bv
    })
  }, [items, complexes, districts, prices, dealType, sort])

  const changes = rows.map((r) => r.change).filter((v): v is number => v != null)
  const avg = changes.length ? changes.reduce((s, v) => s + v, 0) / changes.length : null
  const best = rows.filter((r) => r.change != null).reduce<(typeof rows)[number] | null>((m, r) => (!m || r.change! > m.change! ? r : m), null)
  const worst = rows.filter((r) => r.change != null).reduce<(typeof rows)[number] | null>((m, r) => (!m || r.change! < m.change! ? r : m), null)

  function handleRemove(w: WatchItem, name: string) {
    remove(w.id)
    toast(`${name} ${w.area}㎡를 뺐습니다.`, {
      // 되돌리면 새로 등록되므로 가격 정보를 다시 읽는다
      action: { label: "되돌리기", onClick: () => add(w).then(() => router.refresh()) },
    })
  }

  return (
    <>
      <section className="px-4 pt-14 pb-10 text-center sm:pt-20">
        <h1 className="text-[40px] leading-[1.08] font-semibold sm:text-[56px]">관심 단지.</h1>
        <p className="mx-auto mt-4 max-w-xl text-[19px] text-muted-foreground sm:text-[21px]">
          체크한 날의 실거래가와 비교해 얼마나 올랐는지 봅니다.
        </p>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-[1024px]">
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* 모바일에서도 네 장을 한눈에: 2×2 */}
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                <Tile index={0} label="체크한 단지" value={<CountUp value={items.length} suffix="곳" duration={0.6} />} />
                <Tile index={1} label="평균 변동" value={<Change value={avg} />} />
                <Tile
                  index={2}
                  label="가장 많이 오른"
                  value={best ? best.complex.name : "—"}
                  sub={best ? <Change value={best.change} /> : null}
                />
                <Tile
                  index={3}
                  label={worst && worst.change! < 0 ? "가장 많이 내린" : "가장 적게 오른"}
                  value={worst && worst !== best ? worst.complex.name : "—"}
                  sub={worst && worst !== best ? <Change value={worst.change} /> : null}
                />
              </div>

              <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:mt-10 sm:flex-row">
                <Segmented
                  value={dealType}
                  onChange={setDealType}
                  options={[
                    { value: "sale", label: "매매" },
                    { value: "jeonse", label: "전세" },
                  ]}
                />
                <Segmented
                  size="sm"
                  value={sort}
                  onChange={setSort}
                  options={[
                    { value: "up", label: "상승순" },
                    { value: "down", label: "하락순" },
                    { value: "recent", label: "최근 체크" },
                  ]}
                />
              </div>

              <ul className="mt-5 space-y-2 sm:space-y-3">
                {rows.map((r, i) => (
                  <motion.li
                    key={r.w.id}
                    // 처음엔 차례로 떠오르고, 정렬을 바꾸면 새 자리로 미끄러진다
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, delay: Math.min(i, 8) * 0.05, ease: [0.22, 1, 0.36, 1] },
                    }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                    transition={{ type: "spring", stiffness: 400, damping: 36 }}
                    className="rounded-[20px] bg-muted px-4 py-3.5 transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] sm:rounded-[24px] sm:p-6 dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
                        <div className="min-w-0 flex-1">
                          <Link href={`/complex/${r.complex.id}`} className="group flex items-center gap-1">
                            <span className="truncate text-[17px] font-semibold group-hover:underline sm:text-[19px]">{r.complex.name}</span>
                            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                          </Link>
                          <p className="mt-0.5 truncate text-[12px] text-muted-foreground sm:text-[13px]">
                            {r.gu} {r.complex.dong} · {areaLabel(r.w.area)} · {r.w.baseDate} 체크
                          </p>
                        </div>
                        {/* 모바일: 변동률을 이름 옆에 */}
                        <ChangePill value={r.change} className="shrink-0 sm:hidden" />
                      </div>

                      <MiniTrend values={r.snap?.trend ?? []} />

                      {/* 모바일: 기준가 → 최근 실거래 한 줄 */}
                      <p className="tabular text-[13px] sm:hidden">
                        <span className="text-muted-foreground">기준 </span>
                        {formatPrice(r.base)}
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="text-muted-foreground">최근 </span>
                        <span className="font-semibold">{formatPrice(r.current?.price)}</span>
                      </p>

                      <div className="tabular hidden items-center gap-5 sm:flex sm:w-[300px] sm:justify-end">
                        <div className="text-right">
                          <p className="text-[12px] text-muted-foreground">기준가</p>
                          <p className="text-[15px]">{formatPrice(r.base)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] text-muted-foreground">최근 실거래</p>
                          <p className="text-[15px] font-semibold">{formatPrice(r.current?.price)}</p>
                        </div>
                        <ChangePill value={r.change} className="min-w-[84px] justify-center" />
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2 border-t border-foreground/5 pt-2 sm:mt-4 sm:pt-3">
                      <MemoInput
                        initial={r.w.memo}
                        onSave={(v) => {
                          updateMemo(r.w.id, v)
                          toast.success("메모를 저장했습니다.")
                        }}
                      />
                      <button
                        onClick={() => handleRemove(r.w, r.complex.name)}
                        aria-label="관심 단지에서 빼기"
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/5 hover:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-4 text-center text-[12px] text-muted-foreground">
                변동률 = (최근 실거래 중위가 − 기준가) ÷ 기준가. 거래가 적은 단지는 1~2건에 크게 흔들릴 수 있습니다.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  )
}

function Tile({ index, label, value, sub }: { index: number; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Reveal delay={index * 0.08} className="h-full min-w-0">
      <TiltCard className="h-full rounded-[20px] bg-muted px-4 py-4 sm:rounded-[28px] sm:px-6 sm:py-7">
        <p className="text-[12px] font-medium text-muted-foreground sm:text-[13px]">{label}</p>
        <p className="tabular mt-1 truncate text-[18px] leading-tight font-semibold sm:mt-2 sm:text-[24px]">{value}</p>
        {sub && <p className="mt-1 text-[13px] sm:text-[15px]">{sub}</p>}
      </TiltCard>
    </Reveal>
  )
}

function MiniTrend({ values }: { values: (number | null)[] }) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null)
  if (pts.length < 2) return <div className="hidden w-24 sm:block" />
  const ys = pts.map((p) => p[1])
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const W = 96
  const H = 32
  const d = pts
    .map(([i, v], k) => `${k ? "L" : "M"}${(i / (values.length - 1)) * W} ${H - ((v - min) / (max - min || 1)) * (H - 4) - 2}`)
    .join(" ")
  const up = pts.at(-1)![1] >= pts[0][1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hidden h-8 w-24 sm:block" aria-label="최근 12개월 매매 추이">
      <path d={d} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function MemoInput({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== initial && onSave(value)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder="메모 추가"
      aria-label="메모"
      className={cn(
        "h-8 flex-1 rounded-lg bg-transparent px-2 text-[14px] outline-none placeholder:text-muted-foreground",
        "hover:bg-foreground/[0.03] focus:bg-background focus:ring-2 focus:ring-primary/20",
      )}
    />
  )
}

function EmptyState() {
  return (
    <div className="rounded-[28px] bg-muted px-6 py-16 text-center">
      <p className="text-[24px] font-semibold">아직 체크한 단지가 없습니다.</p>
      <p className="mt-2 text-[17px] text-muted-foreground">지도에서 단지를 찾아 ‘관심 등록’을 누르세요.</p>
      <Link href="/" className="mt-6 inline-flex items-center text-[17px] text-link hover:underline">
        지도로 가기 <ChevronRightIcon className="size-4" />
      </Link>
    </div>
  )
}
