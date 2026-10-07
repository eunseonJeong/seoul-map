"use client"

import { useId, useState } from "react"
import { Input } from "@/components/ui/input"
import { areaLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

/** 찜한 관심 단지 (면적별 한 줄) */
export interface WatchOption {
  complexId: string
  name: string
  location: string // 구·동
  area: number // 전용 ㎡
}

/**
 * 단지명 입력칸. 누르면 관심 단지 목록이 열리고, 고르면 onPick 으로 나머지 칸을 채운다.
 * 목록에 없는 단지는 그대로 직접 입력한다.
 */
export function ComplexNameInput({
  value,
  options,
  onChange,
  onPick,
}: {
  value: string
  options: WatchOption[]
  onChange: (name: string) => void
  onPick: (option: WatchOption) => void
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  // 입력한 글자가 들어간 단지만. 이미 고른 이름 그대로면 전체를 보여 준다
  const query = value.trim()
  const filtered =
    !query || options.some((o) => o.name === query) ? options : options.filter((o) => o.name.includes(query))
  const show = open && filtered.length > 0

  function pick(o: WatchOption) {
    onPick(o)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      setOpen(true)
      const step = e.key === "ArrowDown" ? 1 : -1
      setActive((i) => (i + step + filtered.length) % filtered.length)
    } else if (e.key === "Enter" && show && filtered[active]) {
      e.preventDefault()
      pick(filtered[active])
    } else if (e.key === "Escape" && show) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Input
        required
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl bg-white p-1 shadow-[0_8px_30px_rgba(0,0,0,0.16)]"
        >
          <li className="px-3 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground">관심 단지</li>
          {filtered.map((o, i) => (
            <li
              key={`${o.complexId}-${o.area}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // 입력칸 포커스를 잃기 전에 고른다
              onMouseDown={(e) => {
                e.preventDefault()
                pick(o)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-default items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-[14px]",
                i === active && "bg-black/[0.05]",
              )}
            >
              <span className="truncate font-medium">{o.name}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {o.location} · {areaLabel(o.area)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
