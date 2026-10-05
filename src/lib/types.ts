// 가격 단위는 모두 만원, 면적은 전용 ㎡ (기획서 '데이터 모델' 기준)

export type DealType = "sale" | "jeonse"

export type MapMetric = "price" | "change12m" | "jeonseRatio"

export interface MonthlyPoint {
  month: string // YYYY-MM
  sale: number // 3.3㎡당 매매 평균, 만원
  jeonse: number // 3.3㎡당 전세 평균, 만원
}

export interface DistrictFeatures {
  transit: string[]
  school: string[]
  life: string[]
  development: string[]
}

export interface District {
  code: string // 법정동 시군구 코드 (예: 11680)
  name: string // 강남구
  nameEng: string
  summary: string // 한 줄 특징 (사용자가 수정 가능)
  population: number // 명
  salePerPyeong: number // 최근 월 3.3㎡당 매매가, 만원
  jeonsePerPyeong: number
  jeonseRatio: number // %
  change3m: number // %
  change12m: number // %
  weeklyChange: number // % (R-ONE 주간 변동률)
  trend: MonthlyPoint[]
  features: DistrictFeatures
}

export interface Complex {
  id: string
  name: string
  districtCode: string
  dong: string
  address: string
  builtYear: number
  households: number
  lat: number
  lng: number
  areas: number[] // 전용 ㎡
}

export interface Trade {
  complexId: string
  dealType: DealType
  area: number
  floor: number
  price: number // 매매가 또는 전세 보증금, 만원
  contractDate: string // YYYY-MM-DD
  isCancelled: boolean
}

export interface AreaMonthly {
  month: string
  sale: number | null // 월 중위가, 만원
  jeonse: number | null
  saleCount: number
  jeonseCount: number
}

export interface WatchItem {
  id: string
  complexId: string
  area: number
  baseSalePrice: number | null
  baseJeonsePrice: number | null
  baseDate: string // YYYY-MM-DD
  memo: string
  createdAt: string
}
