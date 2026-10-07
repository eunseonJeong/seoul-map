"use client"

import type { Complex, District, MapMetric } from "@/lib/types"
import { NaverMap } from "./naver-map"
import { SvgMap } from "./svg-map"

export interface MapProps {
  districts: District[]
  metric: MapMetric
  domain: [number, number]
  selected: string | null
  onSelect: (code: string | null) => void
  complexes: Complex[]
  watchedIds: Set<string>
}

const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID

/** 네이버 지도 키가 있으면 네이버 지도, 없으면 내장 SVG 지도 */
export function SeoulMap(props: MapProps) {
  if (NAVER_CLIENT_ID) return <NaverMap clientId={NAVER_CLIENT_ID} {...props} />
  return <SvgMap {...props} />
}
