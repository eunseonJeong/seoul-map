"use client"

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
          "rounded-full bg-foreground/[0.06] p-1",
          size === "sm" ? "h-8!" : "h-10!",
        )}
      >
        {options.map((o) => (
          <TabsTrigger
            key={o.value}
            value={o.value}
            className={cn(
              "rounded-full px-4 font-normal text-foreground/70 data-active:font-medium data-active:shadow-[0_1px_3px_rgba(0,0,0,0.12)]",
              size === "sm" ? "text-[12px]" : "text-[14px]",
            )}
          >
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
