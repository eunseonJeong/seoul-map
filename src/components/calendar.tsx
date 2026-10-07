"use client"

import { useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { monthLong } from "@/lib/format"
import { cn } from "@/lib/utils"

// 공통 달력: 날짜(DatePicker)·월(MonthPicker) 선택. 칸을 누르면 달력이 열리고, 고르면 바로 반영된다.

/** 둥근 회색 알약 (필터 줄) */
export const PILL_TRIGGER =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground/[0.06] px-4 text-[14px] outline-none transition hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
/** 폼 입력칸 (Input 과 같은 모양) */
const FIELD_TRIGGER =
  "flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const POPUP = "z-50 rounded-2xl bg-popover p-3 shadow-[0_8px_30px_rgba(0,0,0,0.16)] outline-none dark:ring-1 dark:ring-foreground/10 origin-(--transform-origin) transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.34,1.36,0.64,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-out motion-reduce:transition-none"
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

const pad = (n: number) => String(n).padStart(2, "0")
const toYmd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
function todayYmd() {
  const t = new Date()
  return toYmd(t.getFullYear(), t.getMonth() + 1, t.getDate())
}

/** "2026-10-07" → "2026년 10월 7일 (수)" */
function dateLong(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number)
  return `${y}년 ${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`
}

/** 날짜 고르기. 값은 YYYY-MM-DD */
export function DatePicker({
  label,
  value,
  min,
  max,
  onChange,
  className,
}: {
  label: string
  value: string
  min?: string
  max?: string
  onChange: (ymd: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  // 보고 있는 달 [년, 월(1~12)]
  const [view, setView] = useState(() => [Number(value.slice(0, 4)), Number(value.slice(5, 7))])
  const [year, month] = view
  const today = todayYmd()

  const firstDay = new Date(year, month - 1, 1).getDay()
  const days = new Date(year, month, 0).getDate()
  const cells = [...Array<null>(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const move = (n: number) => {
    const d = new Date(year, month - 1 + n, 1)
    setView([d.getFullYear(), d.getMonth() + 1])
  }
  const outOfRange = (ymd: string) => (min != null && ymd < min) || (max != null && ymd > max)

  function pick(ymd: string) {
    onChange(ymd)
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setView([Number(value.slice(0, 4)), Number(value.slice(5, 7))])
        setOpen(next)
      }}
    >
      <Popover.Trigger aria-label={label} className={cn(FIELD_TRIGGER, "tabular", className)}>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        {dateLong(value)}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className={cn(POPUP, "w-[280px]")}>
            <Header title={monthLong(`${year}-${pad(month)}`)} onPrev={() => move(-1)} onNext={() => move(1)} prevLabel="이전 달" nextLabel="다음 달" />
            <div className="mt-2 grid grid-cols-7 text-center text-[12px] text-muted-foreground">
              {WEEKDAYS.map((w, i) => (
                <span key={w} className={cn("py-1", i === 0 && "text-up/80")}>
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (d == null) return <span key={`blank-${i}`} />
                const ymd = toYmd(year, month, d)
                const selected = ymd === value
                const disabled = outOfRange(ymd)
                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-label={dateLong(ymd)}
                    onClick={() => pick(ymd)}
                    className={cn(
                      "tabular mx-auto grid size-9 place-items-center rounded-full text-[14px] transition",
                      selected ? "bg-foreground font-medium text-background" : "hover:bg-foreground/[0.06]",
                      !selected && ymd === today && "font-semibold text-link",
                      !selected && i % 7 === 0 && ymd !== today && "text-up/80",
                      disabled && "pointer-events-none text-foreground/25",
                    )}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            {!outOfRange(today) && (
              <button
                type="button"
                onClick={() => pick(today)}
                className="mt-2 h-8 w-full rounded-full text-[13px] text-link transition hover:bg-foreground/[0.04]"
              >
                오늘
              </button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** 월 고르기. 값은 YYYY-MM, min~max 밖의 달은 고를 수 없다 */
export function MonthPicker({
  label,
  value,
  min,
  max,
  onChange,
  className,
}: {
  label: string
  value: string
  min: string
  max: string
  onChange: (month: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number(value.slice(0, 4)))

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setYear(Number(value.slice(0, 4)))
        setOpen(next)
      }}
    >
      <Popover.Trigger aria-label={label} className={cn(PILL_TRIGGER, "tabular", className)}>
        <CalendarIcon className="size-4 text-muted-foreground" />
        {monthLong(value)}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end" className="z-50">
          <Popover.Popup className={cn(POPUP, "w-[248px]")}>
            <Header
              title={`${year}년`}
              onPrev={year > Number(min.slice(0, 4)) ? () => setYear(year - 1) : undefined}
              onNext={year < Number(max.slice(0, 4)) ? () => setYear(year + 1) : undefined}
              prevLabel="이전 해"
              nextLabel="다음 해"
            />
            <div className="mt-2 grid grid-cols-4 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const m = `${year}-${pad(i + 1)}`
                const disabled = m < min || m > max
                const active = m === value
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    aria-pressed={active}
                    onClick={() => {
                      onChange(m)
                      setOpen(false)
                    }}
                    className={cn(
                      "h-9 rounded-full text-[14px] transition",
                      active ? "bg-foreground font-medium text-background" : "hover:bg-foreground/[0.06]",
                      disabled && "pointer-events-none text-foreground/25",
                    )}
                  >
                    {i + 1}월
                  </button>
                )
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** 달력 머리: ◀ 제목 ▶ (콜백이 없으면 그 방향은 막는다) */
function Header({
  title,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  title: string
  onPrev?: () => void
  onNext?: () => void
  prevLabel: string
  nextLabel: string
}) {
  const btn =
    "flex size-8 items-center justify-center rounded-full transition hover:bg-foreground/[0.06] disabled:pointer-events-none disabled:opacity-25"
  return (
    <div className="flex items-center justify-between">
      <button type="button" aria-label={prevLabel} disabled={!onPrev} onClick={onPrev} className={btn}>
        <ChevronLeftIcon className="size-4" />
      </button>
      <Popover.Title className="tabular text-[15px] font-semibold">{title}</Popover.Title>
      <button type="button" aria-label={nextLabel} disabled={!onNext} onClick={onNext} className={btn}>
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  )
}
