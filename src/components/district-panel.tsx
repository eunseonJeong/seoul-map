"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronRightIcon, ConstructionIcon, GraduationCapIcon, ShoppingBagIcon, TrainFrontIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Change } from "@/components/change"
import { Sparkline } from "@/components/price-chart"
import { formatManwon, formatPopulation } from "@/lib/format"
import { useDistrictMemos } from "@/lib/local-store"
import { formatMetric, metricValue, METRICS } from "@/lib/map-metrics"
import type { Complex, District, MapMetric } from "@/lib/types"

const FEATURE_GROUPS = [
  { key: "transit", label: "교통", Icon: TrainFrontIcon },
  { key: "school", label: "학군", Icon: GraduationCapIcon },
  { key: "life", label: "생활", Icon: ShoppingBagIcon },
  { key: "development", label: "개발 호재", Icon: ConstructionIcon },
] as const

export function DistrictPanel({
  district,
  complexes,
  onClose,
}: {
  district: District
  complexes: Complex[]
  onClose: () => void
}) {
  const { memos, setMemo } = useDistrictMemos()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">{district.nameEng}</p>
          <h3 className="mt-1 text-[28px] font-semibold leading-tight">{district.name}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{district.summary}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="선택 해제"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-black/5 text-foreground/60 transition hover:bg-black/10"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border/60">
        <Stat label="3.3㎡당 매매" value={formatManwon(district.salePerPyeong)} />
        <Stat label="3.3㎡당 전세" value={formatManwon(district.jeonsePerPyeong)} />
        <Stat label="1년 변동" value={<Change value={district.change12m} />} />
        <Stat label="3개월 변동" value={<Change value={district.change3m} />} />
        <Stat label="전세가율" value={`${district.jeonseRatio.toFixed(1)}%`} />
        <Stat label="주간 변동 (R-ONE)" value={<Change value={district.weeklyChange} digits={2} />} />
      </dl>

      <div>
        <div className="flex items-baseline justify-between">
          <h4 className="text-[15px] font-semibold">3.3㎡당 매매가 추이</h4>
          <span className="text-[12px] text-muted-foreground">최근 24개월</span>
        </div>
        <Sparkline data={district.trend} className="mt-2" />
      </div>

      <div className="space-y-4">
        {FEATURE_GROUPS.map(({ key, label, Icon }) => (
          <div key={key} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
              <Icon className="size-4 text-foreground/70" />
            </span>
            <div>
              <p className="text-[12px] text-muted-foreground">{label}</p>
              <p className="text-[14px] leading-relaxed">{district.features[key].join(" · ")}</p>
            </div>
          </div>
        ))}
        <p className="text-[12px] text-muted-foreground">인구 {formatPopulation(district.population)}</p>
      </div>

      <MemoBox
        key={district.code}
        initial={memos[district.code] ?? ""}
        onSave={(v) => {
          setMemo(district.code, v)
          toast.success(`${district.name} 메모를 저장했습니다.`)
        }}
      />

      {complexes.length > 0 && (
        <div>
          <h4 className="mb-2 text-[15px] font-semibold">이 구의 단지</h4>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-muted/60">
            {complexes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/complex/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 text-[14px] transition hover:bg-black/[0.03]"
                >
                  <span>
                    {c.name}
                    <span className="ml-2 text-[12px] text-muted-foreground">
                      {c.dong} · {c.builtYear}년
                    </span>
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-muted/70 px-4 py-3">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="tabular mt-0.5 text-[17px] font-semibold">{value}</dd>
    </div>
  )
}

function MemoBox({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  const dirty = value !== initial
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[15px] font-semibold">내 메모</h4>
        {dirty && (
          <button onClick={() => onSave(value)} className="text-[14px] text-link hover:underline">
            저장
          </button>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="장단점, 임장 후기, 눈여겨볼 호재를 적어 두세요."
        className="min-h-20 rounded-xl border-transparent bg-muted/70 text-[14px] shadow-none focus-visible:bg-background"
      />
    </div>
  )
}

/** 구를 고르기 전: 현재 지표 기준 순위 */
export function DistrictRanking({
  districts,
  metric,
  onSelect,
}: {
  districts: District[]
  metric: MapMetric
  onSelect: (code: string) => void
}) {
  const sorted = [...districts].sort((a, b) => metricValue(b, metric) - metricValue(a, metric))
  const label = METRICS.find((m) => m.id === metric)!.label
  return (
    <div>
      <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">Seoul</p>
      <h3 className="mt-1 text-[28px] font-semibold leading-tight">구를 선택하세요</h3>
      <p className="mt-2 text-[15px] text-muted-foreground">지도에서 구를 누르면 시세와 특징이 여기에 나옵니다.</p>
      <h4 className="mt-6 mb-2 text-[15px] font-semibold">{label} 순위</h4>
      <ol className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-muted/60">
        {sorted.map((d, i) => (
          <li key={d.code}>
            <button
              onClick={() => onSelect(d.code)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition hover:bg-black/[0.03]"
            >
              <span className="tabular w-5 text-[12px] text-muted-foreground">{i + 1}</span>
              <span className="flex-1">{d.name}</span>
              <span className="tabular font-medium">{formatMetric(metricValue(d, metric), metric)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
