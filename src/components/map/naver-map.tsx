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
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.naver?.maps)
  const [failed, setFailed] = useState(false)

  // 콜백이 바뀌어도 리스너를 다시 달지 않도록 최신 값을 ref 에 둔다
  const latest = useRef({ districts, onSelect, selected })
  useEffect(() => {
    latest.current = { districts, onSelect, selected }
  }, [districts, onSelect, selected])

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
    m.data.addListener("mouseover", (e: any) => m.data.overrideStyle(e.feature, { strokeWeight: 2, strokeColor: "#1d1d1f" }))
    m.data.addListener("mouseout", () => m.data.revertStyle())
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
    markers.current = complexes.map((c) => {
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
      return mk
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
