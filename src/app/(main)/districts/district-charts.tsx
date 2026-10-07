"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Segmented } from "@/components/segmented"
import { formatManwon, formatPct, monthLabel } from "@/lib/format"
import type { District } from "@/lib/types"
import type { DistrictRow } from "./rows"

type Metric = "salePerPyeong" | "jeonsePerPyeong" | "jeonseRatio" | "periodChange"

const SALE = "#0071e3"
const UP = "#d70015"
const DOWN = "#0a5bd3"
// 추이선 색 (고정 순서, 색맹 검증 통과). 구가 이보다 많으면 추이는 그리지 않는다
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7"]

const METRIC_FORMAT: Record<Metric, (v: number) => string> = {
  salePerPyeong: formatManwon,
  jeonsePerPyeong: formatManwon,
  jeonseRatio: (v) => `${v.toFixed(1)}%`,
  periodChange: (v) => formatPct(v),
}

export function DistrictCharts({
  rows,
  districts,
  from,
  to,
  periodLabel,
}: {
  rows: DistrictRow[]
  districts: District[] // 추이용: 고른 구만
  from: string
  to: string
  periodLabel: string
}) {
  const hasPeriod = rows.some((r) => r.periodChange != null)
  const options: { value: Metric; label: string }[] = [
    { value: "salePerPyeong", label: "매매" },
    { value: "jeonsePerPyeong", label: "전세" },
    { value: "jeonseRatio", label: "전세가율" },
    ...(hasPeriod ? [{ value: "periodChange" as const, label: "기간 변동" }] : []),
  ]
  const [picked, setPicked] = useState<Metric>("salePerPyeong")
  const metric = options.some((o) => o.value === picked) ? picked : "salePerPyeong"
  const format = METRIC_FORMAT[metric]
  const metricLabel =
    metric === "periodChange" ? `매매 ${periodLabel}` : `${options.find((o) => o.value === metric)!.label} · ${monthLabel(to)}`

  const bars = rows
    .filter((r) => r[metric] != null)
    .map((r) => ({ name: r.name, value: r[metric]! }))
    .sort((a, b) => b.value - a.value)
  const barConfig = { value: { label: metricLabel, color: SALE } } satisfies ChartConfig

  return (
    <div className="grid gap-5">
      <div className="rounded-[28px] bg-muted px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-semibold">구별 비교</h2>
            <p className="text-[13px] text-muted-foreground">{metricLabel}</p>
          </div>
          <Segmented value={metric} onChange={setPicked} options={options} size="sm" />
        </div>
        {bars.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-muted-foreground">이 달에는 자료가 없습니다.</p>
        ) : (
          <ChartContainer config={barConfig} className="mt-4 aspect-auto w-full" style={{ height: bars.length * 30 + 16 }}>
            <BarChart data={bars} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap={4}>
              <XAxis type="number" hide domain={metric === "periodChange" ? ["auto", "auto"] : [0, "auto"]} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={64} interval={0} />
              <ChartTooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    formatter={(v) => <span className="tabular font-medium">{format(Number(v))}</span>}
                  />
                }
              />
              <Bar dataKey="value" radius={4} maxBarSize={22}>
                {bars.map((b) => (
                  <Cell key={b.name} fill={metric === "periodChange" ? (b.value >= 0 ? UP : DOWN) : SALE} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  className="tabular fill-foreground/80 text-[12px]"
                  formatter={(v) => format(Number(v))}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <TrendChart districts={districts} from={from} to={to} />
    </div>
  )
}

/** 고른 구들의 3.3㎡당 매매 추이 (시작월 ~ 종료월) */
function TrendChart({ districts, from, to }: { districts: District[]; from: string; to: string }) {
  if (districts.length > SERIES.length) {
    return (
      <div className="rounded-[28px] bg-muted px-6 py-8 text-center text-[14px] text-muted-foreground">
        매매가 추이는 구를 {SERIES.length}개 이하로 고르면 볼 수 있습니다.
      </div>
    )
  }

  const months = [...new Set(districts.flatMap((d) => d.trend.map((p) => p.month)))]
    .filter((m) => m >= from && m <= to)
    .sort()
  const data = months.map((month) => {
    const point: Record<string, string | number | null> = { month }
    for (const d of districts) point[d.code] = d.trend.find((p) => p.month === month)?.sale ?? null
    return point
  })
  const config = Object.fromEntries(
    districts.map((d, i) => [d.code, { label: d.name, color: SERIES[i] }]),
  ) satisfies ChartConfig

  return (
    <div className="rounded-[28px] bg-muted px-4 py-6 sm:px-6">
      <h2 className="text-[19px] font-semibold">매매가 추이</h2>
      <p className="text-[13px] text-muted-foreground">
        3.3㎡당 매매 · {monthLabel(from)} ~ {monthLabel(to)}
      </p>
      {months.length < 2 ? (
        <p className="py-10 text-center text-[14px] text-muted-foreground">추이를 보려면 기간을 두 달 이상으로 고르세요.</p>
      ) : (
        <ChartContainer config={config} className="mt-4 aspect-auto h-72 w-full sm:h-80">
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e8e8ed" />
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
              tickFormatter={(v) => formatManwon(Number(v))}
              domain={["auto", "auto"]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => monthLabel(String(p?.[0]?.payload?.month ?? ""))}
                  formatter={(v, name, item) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="size-2 rounded-full" style={{ background: item.color }} />
                        {config[String(name)]?.label}
                      </span>
                      <span className="tabular font-medium">{formatManwon(Number(v))}</span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {districts.map((d, i) => (
              <Line
                key={d.code}
                dataKey={d.code}
                type="monotone"
                stroke={SERIES[i]}
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </div>
  )
}
