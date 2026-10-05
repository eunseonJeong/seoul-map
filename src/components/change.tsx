import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react"
import { changeTone, formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

/** 상승·하락 표시. 상승 빨강, 하락 파랑 */
export function Change({ value, className, digits = 1 }: { value: number | null | undefined; className?: string; digits?: number }) {
  const Icon = value == null || Math.abs(value) < 0.05 ? MinusIcon : value > 0 ? ArrowUpRightIcon : ArrowDownRightIcon
  return (
    <span className={cn("tabular inline-flex items-center gap-0.5 font-medium", changeTone(value), className)}>
      <Icon className="size-[0.95em]" aria-hidden />
      {formatPct(value, digits)}
    </span>
  )
}

export function ChangePill({ value, className }: { value: number | null | undefined; className?: string }) {
  const bg =
    value == null || Math.abs(value) < 0.05 ? "bg-muted" : value > 0 ? "bg-up/10" : "bg-down/10"
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[13px]", bg, className)}>
      <Change value={value} />
    </span>
  )
}
