import { SiteNav } from "@/components/site-nav"
import { DATA_AS_OF, DATA_IS_MOCK } from "@/lib/api"

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteNav />
      {DATA_IS_MOCK && (
        <div className="bg-muted text-center text-[12px] text-muted-foreground">
          <p className="mx-auto max-w-[1024px] px-4 py-2">
            지금 보이는 가격은 화면 확인용 예시 데이터입니다. 백엔드를 연결하면 국토교통부 실거래가로 바뀝니다.
          </p>
        </div>
      )}
      <main className="flex-1">{children}</main>
      <footer className="bg-muted">
        <div className="mx-auto max-w-[1024px] space-y-2 px-4 py-6 text-[12px] leading-relaxed text-muted-foreground sm:px-6">
          <p>
            시세: 국토교통부 아파트 매매·전월세 실거래가, 한국부동산원 R-ONE 주간 아파트 가격동향 · 기준 {DATA_AS_OF}
          </p>
          <p>가격은 만원, 면적은 전용면적 기준입니다. 3.3㎡당 가격은 1평 기준으로 환산했습니다.</p>
        </div>
      </footer>
    </>
  )
}
