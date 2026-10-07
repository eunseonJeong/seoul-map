"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { PlusIcon, StarIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { DatePicker } from "@/components/calendar"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Segmented } from "@/components/segmented"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { areaLabel, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Complex, VisitInput, VisitNote } from "@/lib/types"
import { ComplexNameInput, type WatchOption } from "./complex-name-input"

type Sort = "recent" | "rating" | "price"

export function VisitsView({
  initialVisits,
  complexes,
  watchOptions,
}: {
  initialVisits: VisitNote[]
  complexes: Complex[]
  watchOptions: WatchOption[]
}) {
  const [visits, setVisits] = useState(initialVisits)
  const [sort, setSort] = useState<Sort>("recent")
  const [editing, setEditing] = useState<VisitNote | "new" | null>(null)

  const rows = useMemo(() => {
    return [...visits].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating || b.visitDate.localeCompare(a.visitDate)
      if (sort === "price") return (a.askingPrice ?? Infinity) - (b.askingPrice ?? Infinity)
      return b.visitDate.localeCompare(a.visitDate) || b.createdAt.localeCompare(a.createdAt)
    })
  }, [visits, sort])

  function handleSaved(saved: VisitNote) {
    setVisits((list) => (list.some((v) => v.id === saved.id) ? list.map((v) => (v.id === saved.id ? saved : v)) : [saved, ...list]))
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setVisits((list) => list.filter((v) => v.id !== id))
    setEditing(null)
  }

  return (
    <>
      <section className="px-4 pt-14 pb-10 text-center sm:pt-20">
        <h1 className="text-[40px] leading-[1.08] font-semibold sm:text-[56px]">임장 노트.</h1>
        <p className="mx-auto mt-4 max-w-xl text-[19px] text-muted-foreground sm:text-[21px]">
          다녀온 단지를 한 표에 모아 비교합니다.
        </p>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-[1024px]">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Segmented
              value={sort}
              onChange={setSort}
              options={[
                { value: "recent", label: "최근 임장" },
                { value: "rating", label: "별점순" },
                { value: "price", label: "호가 낮은순" },
              ]}
            />
            <Button onClick={() => setEditing("new")} className="h-9 px-4">
              <PlusIcon /> 임장 기록 추가
            </Button>
          </div>

          {rows.length === 0 ? (
            <div className="mt-5 rounded-[28px] bg-muted px-6 py-16 text-center">
              <p className="text-[24px] font-semibold">아직 기록이 없습니다.</p>
              <p className="mt-2 text-[17px] text-muted-foreground">‘임장 기록 추가’로 첫 단지를 적어 보세요.</p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-[24px] bg-muted">
              <table className="tabular w-full min-w-[760px] text-[14px]">
                <thead>
                  <tr className="border-b border-foreground/5 text-left text-[12px] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">임장일</th>
                    <th className="px-3 py-3 font-medium">단지</th>
                    <th className="px-3 py-3 font-medium">면적</th>
                    <th className="px-3 py-3 text-right font-medium">호가</th>
                    <th className="px-3 py-3 text-right font-medium">실거래</th>
                    <th className="px-3 py-3 text-right font-medium">역 도보</th>
                    <th className="px-3 py-3 font-medium">별점</th>
                    <th className="px-5 py-3 font-medium">장점 / 단점</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => setEditing(v)}
                      className="cursor-pointer border-b border-foreground/5 align-top transition last:border-0 hover:bg-foreground/[0.03]"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">{v.visitDate}</td>
                      <td className="px-3 py-3.5">
                        <p className="font-semibold">{v.complexName}</p>
                        <p className="text-[12px] text-muted-foreground">{v.location || "—"}</p>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">{v.area ? areaLabel(v.area) : "—"}</td>
                      <td className="px-3 py-3.5 text-right whitespace-nowrap font-semibold">{formatPrice(v.askingPrice)}</td>
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">{formatPrice(v.dealPrice)}</td>
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">{v.walkMinutes != null ? `${v.walkMinutes}분` : "—"}</td>
                      <td className="px-3 py-3.5">
                        <Stars value={v.rating} />
                      </td>
                      <td className="max-w-[240px] px-5 py-3.5 text-[13px]">
                        {v.pros && <p className="truncate">+ {v.pros}</p>}
                        {v.cons && <p className="truncate text-muted-foreground">− {v.cons}</p>}
                        {!v.pros && !v.cons && "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing != null && (
          <VisitForm
            key={editing === "new" ? "new" : editing.id}
            visit={editing === "new" ? null : editing}
            complexes={complexes}
            watchOptions={watchOptions}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
      </Dialog>
    </>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={cn("size-3.5", n <= value ? "fill-amber-400 text-amber-400" : "text-foreground/15")} />
      ))}
    </span>
  )
}

// ---------- 입력 폼 ----------

type FormState = Omit<VisitInput, "area" | "askingPrice" | "dealPrice" | "walkMinutes"> & {
  area: string
  askingPrice: string
  dealPrice: string
  walkMinutes: string
}

const toStr = (n: number | null) => (n == null ? "" : String(n))

function toForm(v: VisitNote | null): FormState {
  return {
    visitDate: v?.visitDate ?? new Date().toISOString().slice(0, 10),
    complexId: v?.complexId ?? null,
    complexName: v?.complexName ?? "",
    location: v?.location ?? "",
    area: toStr(v?.area ?? null),
    askingPrice: toStr(v?.askingPrice ?? null),
    dealPrice: toStr(v?.dealPrice ?? null),
    walkMinutes: toStr(v?.walkMinutes ?? null),
    orientation: v?.orientation ?? "",
    parking: v?.parking ?? "",
    maintenance: v?.maintenance ?? "",
    surroundings: v?.surroundings ?? "",
    pros: v?.pros ?? "",
    cons: v?.cons ?? "",
    rating: v?.rating ?? 3,
    memo: v?.memo ?? "",
  }
}

function VisitForm({
  visit,
  complexes,
  watchOptions,
  onSaved,
  onDeleted,
}: {
  visit: VisitNote | null
  complexes: Complex[]
  watchOptions: WatchOption[]
  onSaved: (v: VisitNote) => void
  onDeleted: (id: string) => void
}) {
  const [form, setForm] = useState(() => toForm(visit))
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  // 관심 단지 이름과 똑같이 입력하면 그 단지와 연결한다
  function typeComplexName(name: string) {
    const c = complexes.find((x) => x.name === name.trim())
    setForm((f) => ({ ...f, complexId: c?.id ?? null, complexName: name }))
  }

  // 목록에서 관심 단지를 고르면 단지명·위치·면적을 채운다
  function pickWatch(o: WatchOption) {
    setForm((f) => ({ ...f, complexId: o.complexId, complexName: o.name, location: o.location, area: String(o.area) }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch(visit ? `/api/visits/${visit.id}` : "/api/visits", {
        method: visit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "저장하지 못했습니다.")
      onSaved(data as VisitNote)
      toast.success(visit ? "수정했습니다." : "임장 기록을 추가했습니다.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!visit) return
    setBusy(true)
    try {
      const res = await fetch(`/api/visits/${visit.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error ?? "삭제하지 못했습니다.")
      onDeleted(visit.id)
      toast(`${visit.complexName} 기록을 삭제했습니다.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.")
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  const linked = form.complexId ? complexes.find((c) => c.id === form.complexId) : null

  return (
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-[19px] font-semibold">{visit ? visit.complexName : "임장 기록 추가"}</DialogTitle>
      </DialogHeader>

      <form id="visit-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="임장일">
          <DatePicker label="임장일" value={form.visitDate} onChange={(v) => set("visitDate", v)} />
        </Field>
        <Field
          label="단지명"
          hint={
            linked ? (
              <Link href={`/complex/${linked.id}`} className="text-link hover:underline">
                관심 단지 · 상세 보기
              </Link>
            ) : watchOptions.length ? (
              "직접 입력하거나 관심 단지에서 선택"
            ) : null
          }
        >
          <ComplexNameInput value={form.complexName} options={watchOptions} onChange={typeComplexName} onPick={pickWatch} />
        </Field>
        <Field label="위치 (구·동)">
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="강남구 대치동" />
        </Field>
        <Field label="전용면적 (㎡)">
          <Input type="number" inputMode="decimal" min={0} value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="84" />
        </Field>
        <Field label="역까지 도보 (분)">
          <Input type="number" inputMode="numeric" min={0} value={form.walkMinutes} onChange={(e) => set("walkMinutes", e.target.value)} />
        </Field>
        <Field label="호가 (만원)" hint={form.askingPrice ? formatPrice(Number(form.askingPrice)) : undefined}>
          <Input type="number" inputMode="numeric" min={0} value={form.askingPrice} onChange={(e) => set("askingPrice", e.target.value)} placeholder="215000" />
        </Field>
        <Field label="최근 실거래가 (만원)" hint={form.dealPrice ? formatPrice(Number(form.dealPrice)) : undefined}>
          <Input type="number" inputMode="numeric" min={0} value={form.dealPrice} onChange={(e) => set("dealPrice", e.target.value)} />
        </Field>
        <Field label="동 배치·향">
          <Input value={form.orientation} onChange={(e) => set("orientation", e.target.value)} />
        </Field>
        <Field label="주차">
          <Input value={form.parking} onChange={(e) => set("parking", e.target.value)} />
        </Field>
        <Field label="단지 관리 상태">
          <Input value={form.maintenance} onChange={(e) => set("maintenance", e.target.value)} />
        </Field>
        <Field label="주변 상권·학군">
          <Input value={form.surroundings} onChange={(e) => set("surroundings", e.target.value)} />
        </Field>
        <Field label="장점">
          <Textarea rows={2} value={form.pros} onChange={(e) => set("pros", e.target.value)} />
        </Field>
        <Field label="단점">
          <Textarea rows={2} value={form.cons} onChange={(e) => set("cons", e.target.value)} />
        </Field>
        <Field label="별점">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => set("rating", n)}
                aria-label={`${n}점`}
                aria-pressed={form.rating === n}
                className="grid size-8 place-items-center rounded-full transition hover:bg-foreground/5"
              >
                <StarIcon className={cn("size-5", n <= form.rating ? "fill-amber-400 text-amber-400" : "text-foreground/20")} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="메모" className="sm:col-span-2">
          <Textarea rows={3} value={form.memo} onChange={(e) => set("memo", e.target.value)} />
        </Field>
      </form>

      <DialogFooter>
        {visit && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            기록 삭제
          </Button>
        )}
        <Button type="submit" form="visit-form" disabled={busy}>
          {busy ? "저장 중…" : "저장"}
        </Button>
      </DialogFooter>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="임장 기록을 삭제할까요?"
        description={
          <>
            {visit?.complexName} 기록이 영구히 삭제되며
            <br />
            삭제한 뒤에는 복구할 수 없습니다.
          </>
        }
        confirmLabel="삭제"
        destructive
        pending={busy}
        onConfirm={remove}
      />
    </DialogContent>
  )
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="flex items-baseline justify-between gap-2 text-[13px] font-medium">
        {label}
        {hint && <span className="text-[12px] font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
