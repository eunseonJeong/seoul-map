"use client"

import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatManwon, formatPrice, monthLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

// 색은 globals.css 토큰 (라이트·다크 각각 정의)
const SALE = "var(--chart-sale)"
const JEONSE = "var(--chart-jeonse)"

/** 구 카드용 작은 추이 (3.3㎡당 매매) */
export function Sparkline({ data, className }: { data: { month: string; sale: number }[]; className?: string }) {
  const config = { sale: { label: "3.3㎡당 매매", color: SALE } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-28 w-full", className)}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SALE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={SALE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => monthLabel(String(p?.[0]?.payload?.month ?? ""))}
              formatter={(v) => <span className="tabular font-medium">{formatManwon(Number(v))}</span>}
              hideIndicator
            />
          }
        />
        <Area animationDuration={700} animationEasing="ease-out" dataKey="sale" type="monotone" stroke={SALE} strokeWidth={2} fill="url(#spark-fill)" />
      </AreaChart>
    </ChartContainer>
  )
}

/** 단지 상세: 월별 매매·전세 실거래 중위가 */
export function PriceHistoryChart({
  data,
  baseDate,
}: {
  data: { month: string; sale: number | null; jeonse: number | null }[]
  baseDate?: string
}) {
  const config = {
    sale: { label: "매매", color: SALE },
    jeonse: { label: "전세", color: JEONSE },
  } satisfies ChartConfig
  const baseMonth = baseDate?.slice(0, 7)
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full sm:h-80">
      <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--chart-grid)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          interval="preserveStartEnd"
          minTickGap={28}
          tickFormatter={monthLabel}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => `${(v / 10000).toFixed(v >= 100000 ? 0 : 1)}억`}
          domain={["auto", "auto"]}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => {
                const m = String(p?.[0]?.payload?.month ?? "")
                return `${monthLabel(m)}${m === baseMonth ? " · 관심 등록" : ""}`
              }}
              formatter={(v, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as "sale" | "jeonse"]?.label}</span>
                  <span className="tabular font-medium">{formatPrice(Number(v))}</span>
                </div>
              )}
            />
          }
        />
        <Line animationDuration={700} animationEasing="ease-out" dataKey="sale" type="monotone" stroke={SALE} strokeWidth={2.25} dot={false} connectNulls activeDot={{ r: 4 }} />
        <Line animationDuration={700} animationEasing="ease-out" dataKey="jeonse" type="monotone" stroke={JEONSE} strokeWidth={2.25} dot={false} connectNulls activeDot={{ r: 4 }} />
      </LineChart>
    </ChartContainer>
  )
}
