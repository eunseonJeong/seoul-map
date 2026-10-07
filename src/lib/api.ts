// 데이터 접근 계층. 화면은 이 함수들만 부른다.
// TODO(백엔드 연결): 각 함수 본문을 fetch(`${process.env.API_URL}/...`) 로 바꾸면 된다.
// 반환 타입은 src/lib/types.ts 를 그대로 유지한다.

import {
  COMPLEXES,
  DISTRICTS,
  LATEST_MONTH,
  buildAreaMonthly,
  buildTrades,
} from "./mock-data"
import type { AreaMonthly, Complex, District, Trade } from "./types"

export { latestPrice } from "./price"

export const DATA_IS_MOCK = true
export const DATA_AS_OF = LATEST_MONTH

export async function getDistricts(): Promise<District[]> {
  return DISTRICTS
}

export async function getDistrict(code: string): Promise<District | undefined> {
  return DISTRICTS.find((d) => d.code === code)
}

export async function getComplexes(params?: {
  districtCode?: string
  q?: string
}): Promise<Complex[]> {
  let list = COMPLEXES
  if (params?.districtCode) list = list.filter((c) => c.districtCode === params.districtCode)
  if (params?.q) {
    const q = params.q.trim()
    list = list.filter((c) => c.name.includes(q) || c.dong.includes(q) || c.address.includes(q))
  }
  return list
}

export async function getComplex(id: string): Promise<Complex | undefined> {
  return COMPLEXES.find((c) => c.id === id)
}

export async function getAreaMonthly(complexId: string, area: number): Promise<AreaMonthly[]> {
  return buildAreaMonthly(complexId, area)
}

export async function getTrades(complexId: string, area: number): Promise<Trade[]> {
  return buildTrades(complexId, area)
}
