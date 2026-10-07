const PYEONG = 3.3058

/** 만원 → "23억 5,000" */
export function formatPrice(manwon: number | null | undefined) {
  if (manwon == null) return "—"
  const eok = Math.floor(manwon / 10000)
  const rest = Math.round(manwon % 10000)
  if (eok === 0) return `${rest.toLocaleString()}만`
  if (rest === 0) return `${eok}억`
  return `${eok}억 ${rest.toLocaleString()}`
}

/** 만원 → "8,200만" */
export function formatManwon(manwon: number) {
  return `${Math.round(manwon).toLocaleString()}만`
}

export function formatPct(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—"
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}

export function changePct(now: number | null | undefined, base: number | null | undefined) {
  if (!now || !base) return null
  return ((now - base) / base) * 100
}

/** 상승 빨강 · 하락 파랑 (국내 관례) */
export function changeTone(value: number | null | undefined) {
  if (value == null || Math.abs(value) < 0.05) return "text-muted-foreground"
  return value > 0 ? "text-up" : "text-down"
}

export function toPyeong(m2: number) {
  return Math.round(m2 / PYEONG)
}

export function areaLabel(m2: number) {
  return `${m2}㎡ (${toPyeong(m2)}평)`
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-")
  return `${y.slice(2)}.${m}`
}

export function formatPopulation(n: number) {
  return `${Math.round(n / 10000).toLocaleString()}만 명`
}

/** "2026-09" → "2026년 9월" */
export function monthLong(month: string) {
  const [y, m] = month.split("-")
  return `${y}년 ${Number(m)}월`
}
