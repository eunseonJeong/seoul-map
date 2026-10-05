import type { District, MapMetric } from "./types"
import { formatManwon, formatPct } from "./format"

export const METRICS: { id: MapMetric; label: string; short: string }[] = [
  { id: "price", label: "3.3㎡당 매매가", short: "매매가" },
  { id: "change12m", label: "1년 변동률", short: "1년 변동" },
  { id: "jeonseRatio", label: "전세가율", short: "전세가율" },
]

export function metricValue(d: District, metric: MapMetric) {
  if (metric === "price") return d.salePerPyeong
  if (metric === "change12m") return d.change12m
  return d.jeonseRatio
}

export function formatMetric(value: number, metric: MapMetric) {
  if (metric === "price") return formatManwon(value)
  if (metric === "change12m") return formatPct(value)
  return `${value.toFixed(1)}%`
}

// 단계 색: 값이 클수록 진하게. 변동률은 상승 빨강 · 하락 파랑.
const RAMPS: Record<MapMetric, string[]> = {
  price: ["#eaf2fe", "#bcd6fb", "#7fb0f5", "#3a82eb", "#0a5bd3", "#063a8c"],
  change12m: ["#fdeceb", "#f9c9c5", "#f29a92", "#e8625a", "#d70015", "#99000f"],
  jeonseRatio: ["#e9f7ef", "#c2ebd2", "#8fd9ac", "#4dbf7c", "#1f9a55", "#0f6b39"],
}
const DOWN_RAMP = ["#eaf2fe", "#bcd6fb", "#7fb0f5", "#3a82eb", "#0a5bd3", "#063a8c"]

export function metricDomain(districts: District[], metric: MapMetric): [number, number] {
  const values = districts.map((d) => metricValue(d, metric))
  return [Math.min(...values), Math.max(...values)]
}

export function metricColor(value: number, metric: MapMetric, [min, max]: [number, number]) {
  if (metric === "change12m" && value < 0) {
    const t = min < 0 ? value / min : 0
    return DOWN_RAMP[Math.min(DOWN_RAMP.length - 1, Math.floor(t * DOWN_RAMP.length))]
  }
  const lo = metric === "change12m" ? Math.max(0, min) : min
  const t = max === lo ? 1 : (value - lo) / (max - lo)
  const ramp = RAMPS[metric]
  return ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]
}

/** 진한 칸 위 글자는 흰색 */
export function labelColorFor(fill: string) {
  const r = parseInt(fill.slice(1, 3), 16)
  const g = parseInt(fill.slice(3, 5), 16)
  const b = parseInt(fill.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b < 150 ? "#ffffff" : "#1d1d1f"
}

export function legendStops(metric: MapMetric, domain: [number, number]) {
  const ramp = RAMPS[metric]
  const lo = metric === "change12m" ? Math.max(0, domain[0]) : domain[0]
  return {
    colors: ramp,
    min: formatMetric(lo, metric),
    max: formatMetric(domain[1], metric),
  }
}
