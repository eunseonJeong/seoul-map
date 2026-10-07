import { connection } from "next/server"
import { SiteNav } from "@/components/site-nav"
import { getDataAsOf } from "@/lib/api"
import { requireUser } from "@/lib/users"
import { monthLong } from "@/lib/format"

export default async function MainLayout({ children }: LayoutProps<"/">) {
  await connection() // DB 를 요청마다 읽는다 (빌드 때 미리 그리지 않음)
  const [user, asOf] = await Promise.all([requireUser(), getDataAsOf()])
  return (
    <>
      <SiteNav nickname={user.nickname} />
      <main className="flex-1">{children}</main>
      <footer className="bg-muted">
        <div className="mx-auto max-w-[1024px] space-y-2 px-4 py-6 text-[12px] leading-relaxed text-muted-foreground sm:px-6">
          <p>
            시세: 국토교통부 아파트 매매·전월세 실거래가 · 구별 시세 기준 {monthLong(asOf)} (신고 기한 30일이 지난 달) ·
            주간 변동: 한국부동산원 R-ONE 주간 아파트 매매가격지수
          </p>
          <p>
            인구: 행정안전부 주민등록 인구통계 · 지하철역: 서울 열린데이터광장 역사마스터 · 학교·학원: 교육부 NEIS
            교육정보 개방 포털 · 기사: 네이버 뉴스 검색
          </p>
          <p>
            가격은 만원, 면적은 전용면적 기준입니다. 3.3㎡당 가격은 거래가 ÷ 전용면적 × 3.3058로 환산한 평균이며, 매매 해제
            거래와 전세 갱신 계약은 뺐습니다.
          </p>
        </div>
      </footer>
    </>
  )
}
