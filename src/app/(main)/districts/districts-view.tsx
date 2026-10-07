"use client"

import { useMemo, useState } from "react"
import { RotateCcwIcon } from "lucide-react"
import { MonthPicker } from "@/components/calendar"
import { Segmented } from "@/components/segmented"
import { monthLabel, monthLong } from "@/lib/format"
import type { District } from "@/lib/types"
import { DistrictCharts } from "./district-charts"
import { DistrictTable } from "./district-table"
import { DistrictSelect } from "./filters"
import { addMonths, toRow } from "./rows"

type View = "table" | "chart"

export function DistrictsView({ districts, asOf }: { districts: District[]; asOf: string }) {
  const months = useMemo(
    () => [...new Set(districts.flatMap((d) => d.trend.map((p) => p.month)))].filter((m) => m <= asOf).sort(),
    [districts, asOf],
  )
  const [view, setView] = useState<View>("table")
  // 고른 순서대로 (추이선 색도 이 순서). 비어 있으면 25개 구 전체
  const [selected, setSelected] = useState<string[]>([])
  // 기본 기간: 1년 전 ~ 기준월
  const defaultFrom = months.includes(addMonths(asOf, -12)) ? addMonths(asOf, -12) : months[0]
  const [to, setTo] = useState(asOf)
  const [from, setFrom] = useState(defaultFrom)
  const isDefault = selected.length === 0 && from === defaultFrom && to === asOf

  function reset() {
    setSelected([])
    setFrom(defaultFrom)
    setTo(asOf)
  }

  const picked = selected.length ? selected.map((c) => districts.find((d) => d.code === c)!) : districts
  const rows = picked.map((d) => toRow(d, from, to, asOf))
  const periodLabel = `${monthLabel(from)} → ${monthLabel(to)}`

  const districtOptions = useMemo(
    () => [...districts].sort((a, b) => a.name.localeCompare(b.name, "ko")).map((d) => ({ code: d.code, name: d.name })),
    [districts],
  )

  return (
    <div className="grid gap-5">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "table", label: "표 보기" },
              { value: "chart", label: "차트 보기" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <DistrictSelect options={districtOptions} value={selected} onChange={setSelected} />
            <div className="flex items-center gap-2">
              <MonthPicker label="시작월" value={from} min={months[0]} max={to} onChange={setFrom} />
              <span className="text-muted-foreground">~</span>
              <MonthPicker label="종료월" value={to} min={from} max={months.at(-1)!} onChange={setTo} />
            </div>
            <button
              type="button"
              aria-label="검색 조건 초기화"
              title="검색 조건 초기화"
              onClick={reset}
              disabled={isDefault}
              className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcwIcon className="size-4" />
            </button>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground">
          시세는 종료월({monthLong(to)}) 기준이고, 기간 변동은 시작월 대비 종료월 3.3㎡당 매매 변동률입니다.
          {to !== asOf && " 주간 변동(R-ONE)은 최신 주 값뿐이라 기준월을 고를 때만 보입니다."}
        </p>
      </div>
      {view === "table" ? (
        <DistrictTable rows={rows} periodLabel={periodLabel} />
      ) : (
        <DistrictCharts rows={rows} districts={picked} from={from} to={to} periodLabel={periodLabel} />
      )}
    </div>
  )
}
