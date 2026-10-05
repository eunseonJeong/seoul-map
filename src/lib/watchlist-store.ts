"use client"

// 관심 단지 (watchlist 테이블, /api/watchlist). 여러 화면이 같은 목록을 보도록 모듈에 한 벌 둔다.
// 변경은 화면에 먼저 반영하고(낙관적 업데이트) 실패하면 서버 목록으로 되돌린다.

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"
import type { WatchItem } from "./types"

type State = { loaded: boolean; items: WatchItem[] }
let state: State = { loaded: false, items: [] }
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.")
  return data as T
}

function reload() {
  loading ??= request<WatchItem[]>("/api/watchlist")
    .then((items) => set({ loaded: true, items }))
    .catch(() => {
      toast.error("관심 단지를 불러오지 못했습니다.")
    })
    .finally(() => {
      loading = null
    })
  return loading
}

async function mutate(optimistic: WatchItem[], run: () => Promise<unknown>) {
  set({ loaded: true, items: optimistic })
  try {
    await run()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "저장하지 못했습니다.")
  }
  await reload()
}

const SERVER_SNAPSHOT: State = { loaded: false, items: [] }

/** initial: 서버에서 이미 읽어 온 목록 (있으면 첫 화면에 바로 쓴다) */
export function useWatchlist(initial?: WatchItem[]) {
  // 모듈 상태가 아직 비어 있으면 서버에서 받은 initial 을 보여 준다
  const fallback = useMemo<State>(() => (initial ? { loaded: true, items: initial } : SERVER_SNAPSHOT), [initial])
  const { loaded, items } = useSyncExternalStore(
    subscribe,
    () => (state.loaded ? state : fallback),
    () => fallback,
  )

  useEffect(() => {
    if (state.loaded) return
    if (initial) set({ loaded: true, items: initial })
    else reload()
  }, [initial])

  const add = useCallback((item: Omit<WatchItem, "id" | "createdAt">) => {
    const temp: WatchItem = { ...item, id: `temp-${item.complexId}-${item.area}`, createdAt: new Date().toISOString() }
    const rest = state.items.filter((w) => !(w.complexId === item.complexId && w.area === item.area))
    return mutate([temp, ...rest], () => request("/api/watchlist", { method: "POST", body: JSON.stringify(item) }))
  }, [])

  const remove = useCallback((id: string) => {
    return mutate(
      state.items.filter((w) => w.id !== id),
      () => request(`/api/watchlist/${id}`, { method: "DELETE" }),
    )
  }, [])

  const updateMemo = useCallback((id: string, memo: string) => {
    return mutate(
      state.items.map((w) => (w.id === id ? { ...w, memo } : w)),
      () => request(`/api/watchlist/${id}`, { method: "PATCH", body: JSON.stringify({ memo }) }),
    )
  }, [])

  const has = useCallback(
    (complexId: string, area: number) => items.some((w) => w.complexId === complexId && w.area === area),
    [items],
  )

  return { loaded, items, add, remove, updateMemo, has }
}
