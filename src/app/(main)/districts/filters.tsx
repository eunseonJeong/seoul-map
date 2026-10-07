"use client"

import { Select } from "@base-ui/react/select"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { PILL_TRIGGER } from "@/components/calendar"
import { cn } from "@/lib/utils"

const POPUP = "z-50 rounded-2xl bg-popover p-2 shadow-[0_8px_30px_rgba(0,0,0,0.16)] outline-none dark:ring-1 dark:ring-foreground/10"

/** 구 다중 선택. 아무것도 고르지 않으면 전체 */
export function DistrictSelect({
  options,
  value,
  onChange,
}: {
  options: { code: string; name: string }[]
  value: string[]
  onChange: (codes: string[]) => void
}) {
  const nameOf = (code: string) => options.find((o) => o.code === code)?.name ?? code
  const label =
    value.length === 0
      ? `전체 ${options.length}개 구`
      : value.length <= 2
        ? value.map(nameOf).join(", ")
        : `${nameOf(value[0])} 외 ${value.length - 1}개 구`

  return (
    <Select.Root multiple value={value} onValueChange={(v) => onChange(v as string[])}>
      <Select.Trigger aria-label="구 선택" className={cn(PILL_TRIGGER, "min-w-[180px] justify-between")}>
        <Select.Value>{() => label}</Select.Value>
        <Select.Icon>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50">
          <Select.Popup className={cn(POPUP, "max-h-[min(360px,var(--available-height))] w-[220px] overflow-y-auto")}>
            {options.map((o) => (
              <Select.Item
                key={o.code}
                value={o.code}
                className="flex h-9 cursor-default items-center justify-between rounded-lg px-3 text-[14px] outline-none select-none data-highlighted:bg-foreground/[0.05]"
              >
                <Select.ItemText>{o.name}</Select.ItemText>
                <Select.ItemIndicator>
                  <CheckIcon className="size-4 text-link" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
