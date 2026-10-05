# 서울 부동산

서울 25개 구의 시세·특징을 지도로 보고, 관심 단지의 실거래가 변동을 추적하는 개인용 사이트.
Next.js 16 · Tailwind CSS 4 · shadcn/ui(Base UI) · Recharts · d3-geo

## 실행

```bash
cp .env.example .env.local   # SITE_PIN(4자리), AUTH_SECRET(16자 이상) 채우기
npm install
npm run dev
```

## 화면

| 경로 | 내용 |
| --- | --- |
| `/unlock` | 4자리 비밀번호 입력 (5회 틀리면 15분 잠금) |
| `/` | 구별 단계구분도 지도, 구 특징 패널, 단지 검색 |
| `/watchlist` | 관심 단지 대시보드 (기준가 대비 변동률) |
| `/complex/[id]` | 단지 상세: 면적별 매매·전세 추이, 최근 거래, 관심 등록 |
| `/districts` | 25개 구 시세 비교표 |
| `/visits` | 임장 노트: 다녀온 단지 기록 표 (추가·수정·삭제) |

## 백엔드 연결할 곳

- `src/lib/api.ts` — 모든 조회 함수. 본문을 API/DB 호출로 바꾸고 `DATA_IS_MOCK`를 `false`로.
- `src/lib/local-store.ts` — 관심 단지·구 메모(현재 localStorage). `watchlist`, `region_feature` 테이블 API로 교체.
- `src/app/(main)/watchlist/page.tsx` — 지금은 모든 단지의 최신가를 계산해 넘긴다. 서버에서 watchlist를 읽어 체크한 단지만 조회하도록 변경.
- `src/app/api/unlock/route.ts` — 비밀번호 실패 횟수가 메모리에 있다. 배포(서버리스)에서는 KV/DB로 옮길 것.
- `src/lib/visits.ts` — 임장 노트 저장 계층(현재 서버 메모리, 재시작하면 초기화). 함수 본문을 `visit_note` 테이블 쿼리로 교체. 화면은 `/api/visits`(GET·POST), `/api/visits/[id]`(PUT·DELETE)만 부르므로 손댈 필요 없음. 컬럼은 `src/lib/types.ts`의 `VisitNote`.
- `src/lib/mock-data.ts` — 예시 데이터. 연결 후 삭제.

## 지도

`NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`를 넣으면 네이버 지도(Data 레이어에 구 경계 GeoJSON)로, 비워 두면 내장 SVG 지도로 그린다.
네이버 클라우드 플랫폼 콘솔에서 Web 서비스 URL(localhost, 배포 도메인)을 등록해야 한다.
구 경계: `src/data/seoul-gu.json` (southkorea/seoul-maps, 통계청 2013 경계)
# seoul-map
