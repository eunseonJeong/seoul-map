"use client"

import { useMemo, useRef, useState } from "react"
import { SeoulMap } from "@/components/map/seoul-map"
import { DistrictPanel, DistrictRanking } from "@/components/district-panel"
import { ComplexSearch } from "@/components/complex-search"
import { Segmented } from "@/components/segmented"
import { useWatchlist } from "@/lib/watchlist-store"
import { legendStops, metricDomain, METRICS } from "@/lib/map-metrics"
import type { Complex, District, DistrictFeatures, DistrictHighlights, MapMetric, WatchItem } from "@/lib/types"

export function MapExplorer({
  districts: initialDistricts,
  highlights,
  memos: initialMemos,
  markers,
  initialWatch,
}: {
  districts: District[]
  highlights: Record<string, DistrictHighlights>
  memos: Record<string, string>
  markers: Complex[] // 지도에 찍을 단지 (좌표가 있는 관심 단지)
  initialWatch: WatchItem[]
}) {
  const [metric, setMetric] = useState<MapMetric>("price")
  const [selected, setSelected] = useState<string | null>(null)
  // 패널에서 고친 소개·특징·메모를 새로고침 없이 반영한다
  const [districts, setDistricts] = useState(initialDistricts)
  const [memos, setMemos] = useState(initialMemos)
  const { items } = useWatchlist(initialWatch)
  const panelRef = useRef<HTMLElement>(null)

  function select(code: string | null) {
    setSelected(code)
    // 휴대폰에서는 패널이 지도 아래에 있으므로 선택하면 패널로 내려 준다
    if (code && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }

  const domain = useMemo(() => metricDomain(districts, metric), [districts, metric])
  const watchedIds = useMemo(() => new Set(items.map((w) => w.complexId)), [items])
  const legend = legendStops(metric, domain)
  const district = districts.find((d) => d.code === selected)

  return (
    <div>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <Segmented
          value={metric}
          onChange={setMetric}
          options={METRICS.map((m) => ({ value: m.id, label: m.short }))}
        />
        <ComplexSearch />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-[28px] bg-white p-4 sm:p-6">
          <SeoulMap
            districts={districts}
            metric={metric}
            domain={domain}
            selected={selected}
            onSelect={select}
            complexes={markers}
            watchedIds={watchedIds}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="tabular">{legend.min}</span>
              <span className="flex overflow-hidden rounded-full">
                {legend.colors.map((c) => (
                  <span key={c} className="h-2 w-6" style={{ background: c }} />
                ))}
              </span>
              <span className="tabular">{legend.max}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-foreground bg-[#ff9500]" />
                관심 단지
              </span>
            </div>
          </div>
        </div>

        {/* 데스크톱: 패널 높이를 지도 카드에 맞추고 안에서 스크롤 */}
        <aside ref={panelRef} className="relative scroll-mt-16 overflow-hidden rounded-[28px] bg-white">
          <div className="p-6 lg:absolute lg:inset-0 lg:overflow-y-auto">
          {district ? (
            <DistrictPanel
              district={district}
              highlights={highlights[district.code] ?? { complexes: [], news: [], stat: null }}
              memo={memos[district.code] ?? ""}
              onMemoSaved={(memo) => setMemos((m) => ({ ...m, [district.code]: memo }))}
              onProfileSaved={(profile: { summary: string; features: DistrictFeatures }) =>
                setDistricts((list) => list.map((d) => (d.code === district.code ? { ...d, ...profile } : d)))
              }
              onClose={() => setSelected(null)}
            />
          ) : (
            <DistrictRanking districts={districts} metric={metric} onSelect={select} />
          )}
          </div>
        </aside>
      </div>
    </div>
  )
}
