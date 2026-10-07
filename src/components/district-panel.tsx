"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ChevronRightIcon,
  ConstructionIcon,
  GraduationCapIcon,
  NewspaperIcon,
  PencilIcon,
  ShoppingBagIcon,
  TrainFrontIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Change } from "@/components/change"
import { Sparkline } from "@/components/price-chart"
import { formatManwon, formatPopulation, monthLong } from "@/lib/format"
import { formatMetric, metricValue, METRICS } from "@/lib/map-metrics"
import type { District, DistrictFeatures, DistrictHighlights, DistrictStat, MapMetric } from "@/lib/types"

const FEATURE_GROUPS = [
  { key: "transit", label: "교통", Icon: TrainFrontIcon },
  { key: "school", label: "학군", Icon: GraduationCapIcon },
  { key: "life", label: "생활", Icon: ShoppingBagIcon },
  { key: "development", label: "개발 호재", Icon: ConstructionIcon },
] as const

type Profile = { summary: string; features: DistrictFeatures }

async function putJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "저장하지 못했습니다.")
  return data
}

export function DistrictPanel({
  district,
  highlights,
  memo,
  onMemoSaved,
  onProfileSaved,
  onClose,
}: {
  district: District
  highlights: DistrictHighlights
  memo: string
  onMemoSaved: (memo: string) => void
  onProfileSaved: (profile: Profile) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const hasFeatures = FEATURE_GROUPS.some(({ key }) => district.features[key].length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">{district.nameEng}</p>
          <h3 className="mt-1 text-[28px] font-semibold leading-tight">{district.name}</h3>
          {district.summary ? (
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{district.summary}</p>
          ) : (
            <button onClick={() => setEditing(true)} className="mt-2 text-[14px] text-link hover:underline">
              한 줄 소개 쓰기
            </button>
          )}
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
        <Stat
          label={district.weeklyChangeDate ? `주간 변동 (${shortDate(district.weeklyChangeDate)} 주)` : "주간 변동"}
          value={<Change value={district.weeklyChange} digits={2} />}
        />
      </dl>

      <div>
        <div className="flex items-baseline justify-between">
          <h4 className="text-[15px] font-semibold">3.3㎡당 매매가 추이</h4>
          <span className="text-[12px] text-muted-foreground">최근 {district.trend.length}개월 · 실거래 평균</span>
        </div>
        <Sparkline data={district.trend} className="mt-2" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[15px] font-semibold">내가 정리한 특징</h4>
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[14px] text-link hover:underline">
            <PencilIcon className="size-3.5" /> {hasFeatures || district.summary ? "고치기" : "쓰기"}
          </button>
        </div>
        {hasFeatures ? (
          <div className="space-y-4">
            {FEATURE_GROUPS.filter(({ key }) => district.features[key].length > 0).map(({ key, label, Icon }) => (
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
          </div>
        ) : (
          <p className="rounded-2xl bg-muted/60 px-4 py-3 text-[13px] text-muted-foreground">
            교통·학군·생활·개발 호재를 직접 확인한 내용으로 채워 두세요.
          </p>
        )}
      </div>

      <InfraStats stat={highlights.stat} district={district} />

      <NewsList news={highlights.news} />

      <MemoBox
        key={district.code}
        initial={memo}
        onSave={async (v) => {
          try {
            await putJson(`/api/districts/${district.code}/memo`, { memo: v })
            onMemoSaved(v)
            toast.success(`${district.name} 메모를 저장했습니다.`)
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "저장하지 못했습니다.")
          }
        }}
      />

      {highlights.complexes.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className="text-[15px] font-semibold">거래가 많은 단지</h4>
            <span className="text-[12px] text-muted-foreground">최근 1년 매매</span>
          </div>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-muted/60">
            {highlights.complexes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/complex/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-[14px] transition hover:bg-black/[0.03]"
                >
                  <span className="min-w-0 truncate">
                    {c.name}
                    <span className="ml-2 text-[12px] text-muted-foreground">
                      {c.dong}
                      {c.builtYear ? ` · ${c.builtYear}년` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
                    {c.saleCount}건
                    <ChevronRightIcon className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ProfileDialog
        key={`${district.code}-${editing}`}
        open={editing}
        onOpenChange={setEditing}
        district={district}
        onSaved={(profile) => {
          onProfileSaved(profile)
          setEditing(false)
        }}
      />
    </div>
  )
}

function InfraStats({ stat, district }: { stat: DistrictStat | null; district: District }) {
  const population =
    district.population != null
      ? `인구 ${formatPopulation(district.population)}${district.populationMonth ? ` (${monthLong(district.populationMonth)})` : ""}`
      : null
  if (!stat) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {population ? `${population} · ` : ""}지하철역·학교·학원 통계는 아직 수집 전입니다.
      </p>
    )
  }
  const n = (v: number | null) => (v == null ? "—" : v.toLocaleString())
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-[15px] font-semibold">생활 인프라</h4>
        {population && <span className="text-[12px] text-muted-foreground">{population}</span>}
      </div>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-border/60">
        <Stat label="지하철역" value={`${n(stat.subwayStations)}곳`} />
        <Stat label="초·중·고" value={`${n(stat.elementarySchools)}·${n(stat.middleSchools)}·${n(stat.highSchools)}`} />
        <Stat label="입시·보습 학원" value={`${n(stat.examAcademies)}곳`} />
      </dl>
      {stat.subwayLines.length > 0 && (
        <p className="mt-2 text-[12px] text-muted-foreground">노선: {stat.subwayLines.join(", ")}</p>
      )}
      <p className="mt-1 text-[12px] text-muted-foreground">
        학원 {n(stat.academies)} · 교습소 {n(stat.tutoringCenters)}
      </p>
    </div>
  )
}

/** "2026-09-28" → "9월 28일" */
const shortDate = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`

function NewsList({ news }: { news: DistrictHighlights["news"] }) {
  if (news.length === 0) return null
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="flex items-center gap-1.5 text-[15px] font-semibold">
          <NewspaperIcon className="size-4" /> 관련 기사
        </h4>
        <span className="text-[12px] text-muted-foreground">네이버 뉴스 · 최근 30일</span>
      </div>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-muted/60">
        {news.map((item) => (
          <li key={item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 transition hover:bg-black/[0.03]"
            >
              <p className="line-clamp-2 text-[14px] leading-snug">{item.title}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {new Date(item.publishedAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" })}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProfileDialog({
  open,
  onOpenChange,
  district,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  district: District
  onSaved: (profile: Profile) => void
}) {
  const [summary, setSummary] = useState(district.summary)
  // 특징은 한 줄에 하나씩
  const [lines, setLines] = useState(() =>
    Object.fromEntries(FEATURE_GROUPS.map(({ key }) => [key, district.features[key].join("\n")])) as Record<keyof DistrictFeatures, string>,
  )
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const features = Object.fromEntries(
        FEATURE_GROUPS.map(({ key }) => [key, lines[key].split("\n").map((l) => l.trim()).filter(Boolean)]),
      ) as unknown as DistrictFeatures
      onSaved(await putJson(`/api/districts/${district.code}`, { summary, features }))
      toast.success(`${district.name} 소개를 저장했습니다.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[24px] p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold">{district.name} 소개·특징</DialogTitle>
        </DialogHeader>
        <label className="grid gap-1.5">
          <span className="text-[13px] text-muted-foreground">한 줄 소개</span>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={200} />
        </label>
        {FEATURE_GROUPS.map(({ key, label }) => (
          <label key={key} className="grid gap-1.5">
            <span className="text-[13px] text-muted-foreground">{label} (한 줄에 하나씩)</span>
            <Textarea
              value={lines[key]}
              onChange={(e) => setLines((l) => ({ ...l, [key]: e.target.value }))}
              className="min-h-16 rounded-xl"
            />
          </label>
        ))}
        <DialogFooter>
          <Button className="h-10 w-full text-[15px]" disabled={busy} onClick={save}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function MemoBox({ initial, onSave }: { initial: string; onSave: (v: string) => Promise<void> }) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const dirty = value !== saved
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[15px] font-semibold">내 메모</h4>
        {dirty && (
          <button
            onClick={async () => {
              await onSave(value)
              setSaved(value)
            }}
            className="text-[14px] text-link hover:underline"
          >
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
