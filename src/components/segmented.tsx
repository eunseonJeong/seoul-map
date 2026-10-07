"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/** 애플 스타일 세그먼트 컨트롤 (shadcn Tabs 기반) */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "default",
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
  size?: "default" | "sm"
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)} className={className}>
      <TabsList
        className={cn(
          "relative rounded-full bg-foreground/[0.06] p-1",
          size === "sm" ? "h-8!" : "h-10!",
        )}
      >
        {options.map((o) => (
          <TabsTrigger
            key={o.value}
            value={o.value}
            className={cn(
              // 선택 배경은 아래 Indicator 가 그린다 (탭은 투명하게, 글자는 그 위에)
              "relative z-10 rounded-full px-4 font-normal text-foreground/70 data-active:bg-transparent! data-active:font-medium data-active:shadow-none! dark:data-active:border-transparent!",
              size === "sm" ? "text-[12px]" : "text-[14px]",
            )}
          >
            {o.label}
          </TabsTrigger>
        ))}
        {/* 선택 표시: 고른 탭 자리로 미끄러져 간다 */}
        <TabsPrimitive.Indicator className="absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) rounded-full bg-background shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-[left,width] duration-300 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none dark:bg-foreground/15" />
      </TabsList>
    </Tabs>
  )
}
