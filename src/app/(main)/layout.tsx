import Image from "next/image"
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
      <footer className="border-t border-foreground/5 bg-muted">
        <div className="mx-auto max-w-[1024px] px-4 py-8 text-[12px] leading-relaxed text-muted-foreground sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 로고는 검은색 SVG 라 다크 모드에서는 뒤집어 흰색으로 */}
            <Image
              src="/logo/modoobudongsan_logo_2_cropped.svg"
              alt="모두 부동산"
              width={852}
              height={254}
              className="h-7 w-auto opacity-85 dark:invert"
            />
            <p>
              구별 시세 기준 <span className="font-medium text-foreground/80">{monthLong(asOf)}</span>
            </p>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-1.5 border-t border-foreground/5 pt-5 sm:grid-cols-2">
            {SOURCES.map(([label, source]) => (
              <div key={label} className="flex gap-3">
                <dt className="w-14 shrink-0 font-medium text-foreground/70">{label}</dt>
                <dd>{source}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5">
            가격은 만원, 면적은 전용면적 기준 · 3.3㎡당 가격 = 거래가 ÷ 전용면적 × 3.3058 · 매매 해제·전세 갱신 계약 제외
          </p>
        </div>
      </footer>
    </>
  )
}

/** 자료 출처 [항목, 출처] */
const SOURCES = [
  ["시세", "국토교통부 실거래가 (아파트 매매·전월세)"],
  ["주간 변동", "한국부동산원 R-ONE"],
  ["인구", "행정안전부 주민등록 인구통계"],
  ["지하철", "서울 열린데이터광장"],
  ["학교·학원", "교육부 NEIS"],
  ["기사", "네이버 뉴스"],
] as const
