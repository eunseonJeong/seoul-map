"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, ChevronLeftIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Change } from "@/components/change"
import { PriceHistoryChart } from "@/components/price-chart"
import { Segmented } from "@/components/segmented"
import { latestPrice } from "@/lib/price"
import { areaLabel, changePct, formatPrice, monthLong, toPyeong } from "@/lib/format"
import { useWatchlist } from "@/lib/local-store"
import { cn } from "@/lib/utils"
import type { AreaMonthly, Complex, DealType, Trade } from "@/lib/types"

type AreaData = { area: number; monthly: AreaMonthly[]; trades: Trade[] }

export function ComplexView({
  complex,
  districtName,
  byArea,
}: {
  complex: Complex
  districtName: string
  byArea: AreaData[]
}) {
  const defaultArea = byArea.find((a) => a.area >= 80 && a.area <= 90)?.area ?? byArea[0].area
  const [area, setArea] = useState(defaultArea)
  const [dealType, setDealType] = useState<DealType>("sale")
  const [dialogOpen, setDialogOpen] = useState(false)
  const { items, add, remove } = useWatchlist()
  const router = useRouter()

  const data = byArea.find((a) => a.area === area)!
  const sale = latestPrice(data.monthly, "sale")
  const jeonse = latestPrice(data.monthly, "jeonse")
  const yearAgoSale = findNear(data.monthly, -13, "sale")
  const watch = items.find((w) => w.complexId === complex.id && w.area === area)
  const trades = data.trades.filter((t) => t.dealType === dealType).slice(0, 12)

  return (
    <>
      {/* 애플식 로컬 내비게이션 */}
      <div className="sticky top-12 z-30 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-13 max-w-[1024px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" aria-label="지도로" className="-ml-1 text-muted-foreground hover:text-foreground">
              <ChevronLeftIcon className="size-5" />
            </Link>
            <span className="truncate text-[19px] font-semibold tracking-tight">{complex.name}</span>
          </div>
          {watch ? (
            <Button
              variant="secondary"
              className="h-8 px-4 text-[13px]"
              onClick={() => {
                remove(watch.id)
                toast(`${complex.name} ${area}㎡ 관심을 해제했습니다.`)
              }}
            >
              <CheckIcon /> 관심 단지
            </Button>
          ) : (
            <Button className="h-8 px-4 text-[13px]" onClick={() => setDialogOpen(true)}>
              <PlusIcon /> 관심 등록
            </Button>
          )}
        </div>
      </div>

      <section className="px-4 pt-12 pb-10 text-center sm:px-6">
        <p className="text-[14px] text-muted-foreground">
          {districtName} {complex.dong} · {complex.builtYear}년 준공 · {complex.households.toLocaleString()}세대
        </p>
        <h1 className="mt-2 text-[40px] leading-tight font-semibold sm:text-[48px]">{complex.name}</h1>
        <div className="mt-6 flex justify-center">
          <Segmented
            value={String(area)}
            onChange={(v) => setArea(Number(v))}
            options={byArea.map((a) => ({ value: String(a.area), label: `${a.area}㎡` }))}
          />
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">전용 {areaLabel(area)}</p>
      </section>

      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto grid max-w-[1024px] gap-5 sm:grid-cols-3">
          <Kpi
            label="최근 매매 실거래"
            value={formatPrice(sale?.price)}
            sub={sale ? `${monthLong(sale.month)} 중위가` : "거래 없음"}
          />
          <Kpi
            label="최근 전세 실거래"
            value={formatPrice(jeonse?.price)}
            sub={
              jeonse && sale ? `전세가율 ${((jeonse.price / sale.price) * 100).toFixed(0)}%` : "거래 없음"
            }
          />
          <Kpi
            label={watch ? "관심 등록 후" : "1년 전 대비"}
            value={
              <Change
                value={watch ? changePct(sale?.price, watch.baseSalePrice) : changePct(sale?.price, yearAgoSale)}
                className="text-[32px]"
              />
            }
            sub={
              watch
                ? `기준가 ${formatPrice(watch.baseSalePrice)} · ${watch.baseDate}`
                : `1년 전 ${formatPrice(yearAgoSale)}`
            }
          />
        </div>

        <div className="mx-auto mt-5 max-w-[1024px] rounded-[28px] bg-muted p-5 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[24px] font-semibold">실거래가 추이</h2>
            <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
              <Legend color="#0071e3" label="매매" />
              <Legend color="#86868b" label="전세" />
              <span>월 중위가</span>
            </div>
          </div>
          <div className="mt-6">
            <PriceHistoryChart data={data.monthly} baseDate={watch?.baseDate} />
          </div>
        </div>

        <div className="mx-auto mt-5 max-w-[1024px] rounded-[28px] bg-muted p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[24px] font-semibold">최근 거래</h2>
            <Segmented
              size="sm"
              value={dealType}
              onChange={setDealType}
              options={[
                { value: "sale", label: "매매" },
                { value: "jeonse", label: "전세" },
              ]}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-[14px]">
              <thead>
                <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                  <th className="py-2 font-normal">계약일</th>
                  <th className="py-2 font-normal">층</th>
                  <th className="py-2 text-right font-normal">{dealType === "sale" ? "매매가" : "보증금"}</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {trades.map((t, i) => (
                  <tr key={i} className={cn("border-b border-border/50 last:border-0", t.isCancelled && "text-muted-foreground line-through")}>
                    <td className="py-2.5">
                      {t.contractDate}
                      {t.isCancelled && <span className="ml-2 text-[11px] no-underline">해제</span>}
                    </td>
                    <td className="py-2.5">{t.floor}층</td>
                    <td className="py-2.5 text-right font-medium">{formatPrice(t.price)}</td>
                  </tr>
                ))}
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      최근 24개월 거래가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            신고 기한(30일) 때문에 최근 1~2개월은 거래가 더 늘어날 수 있습니다.
          </p>
        </div>
      </section>

      <WatchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${complex.name} · ${area}㎡ (${toPyeong(area)}평)`}
        sale={sale?.price ?? null}
        jeonse={jeonse?.price ?? null}
        onConfirm={(memo) => {
          add({
            complexId: complex.id,
            area,
            baseSalePrice: sale?.price ?? null,
            baseJeonsePrice: jeonse?.price ?? null,
            baseDate: new Date().toISOString().slice(0, 10),
            memo,
          })
          setDialogOpen(false)
          toast.success("관심 단지에 추가했습니다.", {
            action: { label: "보기", onClick: () => router.push("/watchlist") },
          })
        }}
      />
    </>
  )
}

function findNear(monthly: AreaMonthly[], offset: number, type: "sale" | "jeonse") {
  // offset 위치부터 앞쪽으로 거래가 있는 달을 찾는다
  for (let i = monthly.length + offset; i >= 0; i--) {
    const v = monthly[i]?.[type]
    if (v) return v
  }
  return null
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-[28px] bg-muted px-6 py-7">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-2 text-[32px] leading-tight font-semibold">{value}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-0.5 w-4 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function WatchDialog({
  open,
  onOpenChange,
  title,
  sale,
  jeonse,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  sale: number | null
  jeonse: number | null
  onConfirm: (memo: string) => void
}) {
  const [memo, setMemo] = useState("")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[24px] p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold">관심 단지로 체크</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted px-4 py-3">
            <p className="text-[12px] text-muted-foreground">기준 매매가</p>
            <p className="tabular text-[17px] font-semibold">{formatPrice(sale)}</p>
          </div>
          <div className="rounded-2xl bg-muted px-4 py-3">
            <p className="text-[12px] text-muted-foreground">기준 전세가</p>
            <p className="tabular text-[17px] font-semibold">{formatPrice(jeonse)}</p>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground">
          지금의 최근 실거래가를 기준가로 저장합니다. 이후 새 실거래가 나오면 기준가와 비교해 얼마나 올랐는지 보여 줍니다.
        </p>
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (선택)"
          className="rounded-xl"
        />
        <DialogFooter>
          <Button className="h-10 w-full text-[15px]" onClick={() => onConfirm(memo.trim())}>
            체크하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
