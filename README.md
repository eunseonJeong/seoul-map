# 서울 부동산

서울 25개 구의 시세·특징을 지도로 보고, 관심 단지의 실거래가 변동을 추적하는 개인용 사이트.
Next.js 16 · Tailwind CSS 4 · shadcn/ui(Base UI) · Recharts · d3-geo · Supabase Postgres · Drizzle ORM

## 실행

```bash
cp .env.example .env.local   # 각 항목 설명은 .env.example 참고
npm install
npm run db:migrate           # Supabase Postgres 에 스키마 적용
npm run db:seed-districts    # 서울 25개 구 코드·이름
npm run ingest               # 국토교통부 실거래가 (기본 최근 60개월)
npm run ingest:population    # 행정안전부 주민등록 인구
npm run ingest:news          # 구별 부동산 기사 (NAVER API HUB)
npm run ingest:stats         # 지하철역·학교·학원 (서울 열린데이터광장·NEIS)
npm run dev
```

## 화면

| 경로 | 내용 |
| --- | --- |
| `/unlock` | 4자리 비밀번호 입력 (5회 틀리면 15분 잠금) |
| `/` | 구별 단계구분도 지도, 구 패널(시세·직접 쓰는 소개·인프라 통계·관련 기사·메모), 단지 검색 |
| `/watchlist` | 관심 단지 대시보드 (기준가 대비 변동률) |
| `/complex/[id]` | 단지 상세: 면적별 매매·전세 추이, 최근 거래, 관심 등록 |
| `/districts` | 25개 구 시세 비교표 |
| `/visits` | 임장 노트: 다녀온 단지 기록 표 (추가·수정·삭제) |

## 데이터

출처가 있는 공식 데이터만 쓴다. 없는 값은 비워 두고 화면에 "—" 또는 "수집 전"으로 표시한다.

| 데이터 | 출처 | 코드 |
| --- | --- | --- |
| 매매·전세 거래, 단지 | 국토교통부 아파트 매매·전월세 실거래가 | `src/lib/ingest/molit.ts` |
| 구 월별 3.3㎡당 평균가 | 위 거래 집계 (해제 거래·갱신 전세 제외) | `src/lib/ingest/aggregate.ts` |
| 구 인구 | 행정안전부 주민등록 인구 및 세대현황 | `src/lib/ingest/population.ts` |
| 구별 기사 | NAVER API HUB 뉴스 검색 (최근 30일) | `src/lib/ingest/news.ts` |
| 지하철역·학교·학원 | 서울 열린데이터광장 역사마스터, 교육부 NEIS | `src/lib/ingest/facilities.ts` |
| 구 소개·특징, 메모, 관심 단지, 임장 노트 | 사용자가 직접 입력 | `src/lib/api.ts`, `src/lib/visits.ts` |

- 구별 시세 기준월은 신고 기한(계약 후 30일)이 지난 가장 최근 달이다 (`getDataAsOf`).
- 아직 없는 것: 단지 세대수·좌표(지도 마커), R-ONE 주간 변동률, 매일 자동 수집(cron).

## 지도

`NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`를 넣으면 네이버 지도(Data 레이어에 구 경계 GeoJSON)로, 비워 두면 내장 SVG 지도로 그린다.
네이버 클라우드 플랫폼 콘솔에서 Web 서비스 URL(localhost, 배포 도메인)을 등록해야 한다.
구 경계: `src/data/seoul-gu.json` (southkorea/seoul-maps, 통계청 2013 경계)
# seoul-map
