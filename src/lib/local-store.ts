"use client"

// 관심 단지와 구 메모를 브라우저 localStorage 에 둔다.
// TODO(백엔드 연결): watchlist / region_feature 테이블 API 로 교체. 훅 시그니처는 그대로 둔다.

import { useCallback, useSyncExternalStore } from "react"
import { seedWatchlist } from "./mock-data"
import type { WatchItem } from "./types"

const WATCH_KEY = "sre.watchlist.v1"
const MEMO_KEY = "sre.district-memo.v1"

type Listener = () => void
const listeners = new Set<Listener>()
const cache = new Map<string, unknown>()

function read<T>(key: string, fallback: () => T): T {
  if (cache.has(key)) return cache.get(key) as T
  let value: T
  try {
    const raw = window.localStorage.getItem(key)
    value = raw ? (JSON.parse(raw) as T) : fallback()
  } catch {
    value = fallback()
  }
  cache.set(key, value)
  return value
}

function write<T>(key: string, value: T) {
  cache.set(key, value)
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 실패(사생활 보호 모드 등)는 무시하고 메모리에만 둔다
  }
  listeners.forEach((l) => l())
}

function subscribe(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}

const EMPTY_WATCH: WatchItem[] = []
const EMPTY_MEMO: Record<string, string> = {}

export function useWatchlist() {
  const items = useSyncExternalStore(
    subscribe,
    () => read<WatchItem[]>(WATCH_KEY, seedWatchlist),
    () => EMPTY_WATCH,
  )

  const add = useCallback((item: Omit<WatchItem, "id" | "createdAt">) => {
    const list = read<WatchItem[]>(WATCH_KEY, seedWatchlist)
    const id = `${item.complexId}-${item.area}`
    const next = list.filter((w) => w.id !== id)
    next.unshift({ ...item, id, createdAt: new Date().toISOString().slice(0, 10) })
    write(WATCH_KEY, next)
  }, [])

  const remove = useCallback((id: string) => {
    write(
      WATCH_KEY,
      read<WatchItem[]>(WATCH_KEY, seedWatchlist).filter((w) => w.id !== id),
    )
  }, [])

  const updateMemo = useCallback((id: string, memo: string) => {
    write(
      WATCH_KEY,
      read<WatchItem[]>(WATCH_KEY, seedWatchlist).map((w) => (w.id === id ? { ...w, memo } : w)),
    )
  }, [])

  const has = useCallback(
    (complexId: string, area: number) => items.some((w) => w.complexId === complexId && w.area === area),
    [items],
  )

  return { items, add, remove, updateMemo, has }
}

export function useDistrictMemos() {
  const memos = useSyncExternalStore(
    subscribe,
    () => read<Record<string, string>>(MEMO_KEY, () => ({})),
    () => EMPTY_MEMO,
  )
  const setMemo = useCallback((code: string, memo: string) => {
    write(MEMO_KEY, { ...read<Record<string, string>>(MEMO_KEY, () => ({})), [code]: memo })
  }, [])
  return { memos, setMemo }
}
