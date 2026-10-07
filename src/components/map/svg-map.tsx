"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { geoMercator, geoPath } from "d3-geo"
import type { Feature, FeatureCollection, Geometry } from "geojson"
import seoulGeo from "@/data/seoul-gu.json"
import { formatMetric, labelColorFor, metricColor, metricValue } from "@/lib/map-metrics"
import type { Complex } from "@/lib/types"
import type { MapProps } from "./seoul-map"

type GuFeature = Feature<Geometry, { name: string }>
const geo = seoulGeo as unknown as FeatureCollection<Geometry, { name: string }>

const W = 640
const H = 520

// 이름표가 겹치는 구는 살짝 옮긴다
const LABEL_NUDGE: Record<string, [number, number]> = {
  중구: [0, 4],
  종로구: [0, -6],
  동대문구: [4, 0],
  성동구: [0, 4],
  영등포구: [-4, 6],
  동작구: [4, 0],
}

export function SvgMap({ districts, metric, domain, selected, onSelect, complexes, watchedIds }: MapProps) {
  const router = useRouter()
  const [hover, setHover] = useState<string | null>(null)

  const { paths, projection } = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [12, 12],
        [W - 12, H - 12],
      ],
      geo,
    )
    // 서버·브라우저 소수점 차이로 하이드레이션이 어긋나지 않게 반올림
    const path = geoPath(projection).digits(1)
    const r1 = (n: number) => Math.round(n * 10) / 10
    const paths = (geo.features as GuFeature[]).map((f) => {
      const [cx, cy] = path.centroid(f)
      const [dx, dy] = LABEL_NUDGE[f.properties.name] ?? [0, 0]
      return { name: f.properties.name, d: path(f) ?? "", cx: r1(cx + dx), cy: r1(cy + dy) }
    })
    return { paths, projection }
  }, [])

  const byName = useMemo(() => new Map(districts.map((d) => [d.name, d])), [districts])
  const hovered = hover ? byName.get(hover) : null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="서울 25개 구 지도">
        <g>
          {paths.map((p) => {
            const d = byName.get(p.name)
            const fill = d ? metricColor(metricValue(d, metric), metric, domain) : "var(--map-empty)"
            const isSel = d?.code === selected
            return (
              <path
                key={p.name}
                d={p.d}
                fill={fill}
                stroke="var(--map-stroke)"
                strokeWidth={1.2}
                className="cursor-pointer"
                onMouseEnter={() => setHover(p.name)}
                onMouseLeave={() => setHover((h) => (h === p.name ? null : h))}
                onClick={() => d && onSelect(isSel ? null : d.code)}
              >
                <title>{p.name}</title>
              </path>
            )
          })}
        </g>
        {/* 선택 테두리는 맨 위에 다시 그려 이웃 구에 가리지 않게 */}
        {paths
          .filter((p) => byName.get(p.name)?.code === selected)
          .map((p) => (
            <path
              key={`o-${p.name}`}
              d={p.d}
              fill="none"
              stroke="var(--map-outline)"
              strokeWidth={byName.get(p.name)?.code === selected ? 2.5 : 1.25}
              pointerEvents="none"
            />
          ))}
        {/* 마우스를 올린 구: 살짝 키우고 그림자를 깔아 떠오른 것처럼 */}
        {paths
          .filter((p) => p.name === hover)
          .map((p) => {
            const d = byName.get(p.name)
            return (
              <motion.path
                key={`lift-${p.name}`}
                d={p.d}
                fill={d ? metricColor(metricValue(d, metric), metric, domain) : "var(--map-empty)"}
                stroke="var(--map-outline)"
                strokeWidth={1.5}
                pointerEvents="none"
                initial={{ scale: 1, filter: "drop-shadow(0 0 0 rgb(0 0 0 / 0))" }}
                animate={{ scale: 1.08, filter: "drop-shadow(0 6px 8px rgb(0 0 0 / 0.28))" }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              />
            )
          })}
        <g pointerEvents="none">
          {paths.map((p) => {
            const d = byName.get(p.name)
            const fill = d ? metricColor(metricValue(d, metric), metric, domain) : "var(--map-empty)"
            return (
              <text
                key={`t-${p.name}`}
                x={p.cx}
                y={p.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={d?.code === selected ? 700 : 500}
                fill={d ? labelColorFor(fill) : "var(--muted-foreground)"}
              >
                {p.name.replace(/구$/, "")}
              </text>
            )
          })}
        </g>
        <ComplexDots complexes={complexes} watchedIds={watchedIds} project={projection} onOpen={(id) => router.push(`/complex/${id}`)} />
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-xl bg-background/90 px-3 py-2 text-[13px] shadow-lg ring-1 ring-foreground/5 backdrop-blur">
          <div className="font-semibold">{hovered.name}</div>
          <div className="tabular text-muted-foreground">{formatMetric(metricValue(hovered, metric), metric)}</div>
        </div>
      )}
    </div>
  )
}

function ComplexDots({
  complexes,
  watchedIds,
  project,
  onOpen,
}: {
  complexes: Complex[]
  watchedIds: Set<string>
  project: (p: [number, number]) => [number, number] | null
  onOpen: (id: string) => void
}) {
  return (
    <g>
      {complexes.map((c) => {
        if (c.lat == null || c.lng == null) return null // 좌표 없는 단지
        const raw = project([c.lng, c.lat])
        if (!raw) return null
        const pt = raw.map((n) => Math.round(n * 10) / 10)
        const watched = watchedIds.has(c.id)
        return (
          <g key={c.id} className="cursor-pointer" onClick={() => onOpen(c.id)}>
            <circle cx={pt[0]} cy={pt[1]} r={watched ? 6 : 4.5} fill={watched ? "#ff9500" : "#ffffff"} stroke="#1d1d1f" strokeWidth={1.25} />
            <title>{c.name}</title>
          </g>
        )
      })}
    </g>
  )
}

