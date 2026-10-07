"use client"

// 네이버 지도 API v3 (네이버 클라우드 플랫폼 Maps · Web Dynamic Map)
// NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 가 있을 때만 쓰인다. 구 경계는 Data 레이어에 GeoJSON 으로 얹는다.

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import seoulGeo from "@/data/seoul-gu.json"
import { metricColor, metricValue } from "@/lib/map-metrics"
import type { MapProps } from "./seoul-map"

/* eslint-disable @typescript-eslint/no-explicit-any */

// 구별 외곽선 [lng, lat][] (모두 단일 Polygon)
type Ring = [number, number][]
const RINGS = new Map(
  (seoulGeo as unknown as { features: { properties: { name: string }; geometry: { coordinates: Ring[] } }[] }).features.map((f) => [
    f.properties.name,
    f.geometry.coordinates[0],
  ]),
)

/** 고리의 무게중심 (면적 가중) */
function centroid(ring: Ring): [number, number] {
  let a = 0
  let x = 0
  let y = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[i + 1]
    const f = x0 * y1 - x1 * y0
    a += f
    x += (x0 + x1) * f
    y += (y0 + y1) * f
  }
  return [x / (3 * a), y / (3 * a)]
}

const LIFT_SCALE = 1.08 // 마우스를 올린 구를 키우는 비율
const LIFT_MS = 180

type Lift = { shadow: any; top: any; frame: number }

/** 구를 살짝 키우고 그림자를 깔아 지도 위로 떠오른 것처럼 보이게 한다 */
function liftDistrict(m: any, lift: { current: Lift | null }, name: string, fill: string) {
  dropDistrict(lift)
  const ring = RINGS.get(name)
  if (!ring) return
  const { maps } = window.naver
  const [cx, cy] = centroid(ring)
  // 그림자는 남쪽(아래)으로 구 높이의 4% 만큼 비켜 둔다
  const lats = ring.map((p) => p[1])
  const drop = (Math.max(...lats) - Math.min(...lats)) * 0.04
  const path = (k: number, dy = 0) => ring.map(([x, y]) => new maps.LatLng(cy + (y - cy) * k - dy, cx + (x - cx) * k))

  const shadow = new maps.Polygon({ map: m, paths: [path(1)], clickable: false, strokeOpacity: 0, fillColor: "#000000", fillOpacity: 0, zIndex: 50 })
  const top = new maps.Polygon({
    map: m,
    paths: [path(1)],
    clickable: false,
    fillColor: fill,
    fillOpacity: 0.95,
    strokeColor: "#1d1d1f",
    strokeWeight: 2.5,
    zIndex: 51,
  })
  const state: Lift = { shadow, top, frame: 0 }
  lift.current = state

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const start = performance.now()
  const step = (now: number) => {
    const t = reduce ? 1 : Math.min(1, (now - start) / LIFT_MS)
    const e = 1 - (1 - t) ** 3 // ease-out
    const k = 1 + (LIFT_SCALE - 1) * e
    top.setPaths([path(k)])
    shadow.setPaths([path(k, drop * e)])
    shadow.setOptions({ fillOpacity: 0.22 * e })
    if (t < 1) state.frame = requestAnimationFrame(step)
  }
  state.frame = requestAnimationFrame(step)
}

function dropDistrict(lift: { current: Lift | null }) {
  const cur = lift.current
  if (!cur) return
  cancelAnimationFrame(cur.frame)
  cur.shadow.setMap(null)
  cur.top.setMap(null)
  lift.current = null
}
declare global {
  interface Window {
    naver?: any
  }
}

export function NaverMap({ clientId, districts, metric, domain, selected, onSelect, complexes, watchedIds }: MapProps & { clientId: string }) {
  const router = useRouter()
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markers = useRef<any[]>([])
  // 마우스를 올린 구를 띄워 보이는 덧그림 (그림자 + 확대한 구)
  const lift = useRef<Lift | null>(null)
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.naver?.maps)
  const [failed, setFailed] = useState(false)

  // 콜백이 바뀌어도 리스너를 다시 달지 않도록 최신 값을 ref 에 둔다
  const latest = useRef({ districts, onSelect, selected, metric, domain })
  useEffect(() => {
    latest.current = { districts, onSelect, selected, metric, domain }
  }, [districts, onSelect, selected, metric, domain])

  // 지도 생성 + GeoJSON
  useEffect(() => {
    if (!ready || !el.current || map.current) return
    const { maps } = window.naver
    const m = new maps.Map(el.current, {
      center: new maps.LatLng(37.5642, 126.9976),
      zoom: 11,
      minZoom: 10,
      scaleControl: false,
      mapDataControl: false,
      zoomControl: true,
      zoomControlOptions: { position: maps.Position.TOP_RIGHT, style: maps.ZoomControlStyle.SMALL },
    })
    m.data.addGeoJson(seoulGeo, true)
    m.data.addListener("click", (e: any) => {
      const name = e.feature.getProperty("name")
      const d = latest.current.districts.find((x) => x.name === name)
      if (d) latest.current.onSelect(latest.current.selected === d.code ? null : d.code)
    })
    m.data.addListener("mouseover", (e: any) => {
      const name = e.feature.getProperty("name")
      const { districts, metric, domain } = latest.current
      const d = districts.find((x) => x.name === name)
      liftDistrict(m, lift, name, d ? metricColor(metricValue(d, metric), metric, domain) : "#e8e8ed")
    })
    m.data.addListener("mouseout", () => dropDistrict(lift))
    map.current = m
  }, [ready])

  // 지표·선택이 바뀌면 색 다시 칠하기
  useEffect(() => {
    const m = map.current
    if (!m) return
    m.data.setStyle((feature: any) => {
      const d = districts.find((x) => x.name === feature.getProperty("name"))
      const isSel = d?.code === selected
      return {
        fillColor: d ? metricColor(metricValue(d, metric), metric, domain) : "#e8e8ed",
        fillOpacity: 0.72,
        strokeColor: isSel ? "#1d1d1f" : "#ffffff",
        strokeWeight: isSel ? 3 : 1.5,
      }
    })
  }, [ready, districts, metric, domain, selected])

  // 단지 마커
  useEffect(() => {
    const m = map.current
    if (!m) return
    const { maps } = window.naver
    markers.current.forEach((mk) => mk.setMap(null))
    markers.current = complexes.flatMap((c) => {
      if (c.lat == null || c.lng == null) return [] // 좌표 없는 단지
      const watched = watchedIds.has(c.id)
      const size = watched ? 12 : 9
      const mk = new maps.Marker({
        position: new maps.LatLng(c.lat, c.lng),
        map: m,
        title: c.name,
        icon: {
          content: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${watched ? "#ff9500" : "#fff"};border:1.5px solid #1d1d1f"></div>`,
          anchor: new maps.Point(size / 2, size / 2),
        },
      })
      maps.Event.addListener(mk, "click", () => router.push(`/complex/${c.id}`))
      return [mk]
    })
  }, [ready, complexes, watchedIds, router])

  return (
    <div className="relative aspect-[640/520] w-full overflow-hidden rounded-[20px]">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={el} className="absolute inset-0" />
      {(!ready || failed) && (
        <div className="absolute inset-0 grid place-items-center bg-muted text-[13px] text-muted-foreground">
          {failed ? "네이버 지도를 불러오지 못했습니다. Client ID와 도메인 등록을 확인하세요." : "지도를 불러오는 중…"}
        </div>
      )}
    </div>
  )
}
