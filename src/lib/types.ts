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
  summary: string // 한 줄 소개 (사용자가 직접 쓴다)
  population: number | null // 주민등록 인구, 명
  populationMonth: string | null // 인구 기준월 YYYY-MM
  salePerPyeong: number // 최근 월 3.3㎡당 매매가, 만원
  jeonsePerPyeong: number
  jeonseRatio: number // %
  change3m: number // %
  change12m: number // %
  weeklyChange: number | null // % (R-ONE 주간 변동률, 연결 전에는 null)
  trend: MonthlyPoint[]
  features: DistrictFeatures // 사용자가 직접 쓴다
}

export interface Complex {
  id: string
  name: string
  districtCode: string
  dong: string
  address: string
  builtYear: number | null
  households: number | null // 실거래 자료에 없음 (공동주택 기본정보 연결 전 null)
  lat: number | null // 좌표 (지오코딩 연결 전 null)
  lng: number | null
  areas: number[] // 전용 ㎡ (소수점 버림: 84.97 → 84)
}

export interface Trade {
  complexId: string
  dealType: DealType
  area: number
  floor: number
  price: number // 매매가 또는 전세 보증금, 만원
  contractDate: string // YYYY-MM-DD
  isCancelled: boolean // 매매 해제
  isRenewal: boolean // 전세 갱신 계약
}

export interface AreaMonthly {
  month: string
  sale: number | null // 월 중위가, 만원 (해제 거래 제외)
  jeonse: number | null // 갱신 계약 제외
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

// 임장 노트 (visit_note 테이블)
export interface VisitNote {
  id: string
  visitDate: string // YYYY-MM-DD
  complexId: string | null // 등록된 단지와 연결하면 상세 페이지 링크가 생긴다
  complexName: string
  location: string // 구·동 (예: 강남구 대치동)
  area: number | null // 전용 ㎡
  askingPrice: number | null // 호가, 만원
  dealPrice: number | null // 최근 실거래가, 만원
  walkMinutes: number | null // 역까지 도보, 분
  orientation: string // 동 배치·향
  parking: string
  maintenance: string // 단지 관리 상태
  surroundings: string // 주변 상권·학군
  pros: string
  cons: string
  rating: number // 1~5
  memo: string
  createdAt: string // ISO
  updatedAt: string // ISO
}

export type VisitInput = Omit<VisitNote, "id" | "createdAt" | "updatedAt">

// 구 패널용 요약: 거래가 많은 단지, 관련 기사, 생활 인프라 통계
export interface ComplexSummary {
  id: string
  name: string
  dong: string
  builtYear: number | null
  saleCount: number // 최근 12개월 매매 건수
}

export interface DistrictNewsItem {
  title: string
  description: string
  url: string
  publishedAt: string // ISO
}

export interface DistrictStat {
  subwayStations: number | null
  subwayLines: string[]
  elementarySchools: number | null
  middleSchools: number | null
  highSchools: number | null
  academies: number | null
  tutoringCenters: number | null
  examAcademies: number | null
}

export interface DistrictHighlights {
  complexes: ComplexSummary[]
  news: DistrictNewsItem[]
  stat: DistrictStat | null
}
