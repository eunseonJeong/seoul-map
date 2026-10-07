import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { MapExplorer } from "@/components/map-explorer"
import { CountUp, Reveal, TiltCard } from "@/components/motion"
import { Change } from "@/components/change"
import {
  getComplexesByIds,
  getDataAsOf,
  getDistrictHighlights,
  getDistrictMemos,
  getDistricts,
  listWatchlist,
} from "@/lib/api"
import { requireUser } from "@/lib/users"
import { formatManwon, monthLong } from "@/lib/format"

export default async function HomePage() {
  const user = await requireUser()
  const [asOf, districts, highlights, memos, watchItems] = await Promise.all([
    getDataAsOf(),
    getDistricts(user.id),
    getDistrictHighlights(),
    getDistrictMemos(user.id),
    listWatchlist(user.id),
  ])
  // 지도에는 좌표가 있는 관심 단지만 찍는다
  const markers = (await getComplexesByIds([...new Set(watchItems.map((w) => w.complexId))])).filter(
    (c) => c.lat != null && c.lng != null,
  )

  const topGrowth = [...districts].sort((a, b) => b.change12m - a.change12m)[0]
  const topPrice = [...districts].sort((a, b) => b.salePerPyeong - a.salePerPyeong)[0]
  const topJeonse = [...districts].sort((a, b) => b.jeonseRatio - a.jeonseRatio)[0]
  const seoulAvg = Math.round(districts.reduce((s, d) => s + d.salePerPyeong, 0) / districts.length)

  return (
    <>
      <section className="px-4 pt-14 pb-12 text-center sm:pt-20">
        <p className="text-[14px] font-semibold text-highlight">{monthLong(asOf)} 기준</p>
        {/* <p className="mt-1 text-[12px] text-muted-foreground">
          실거래는 계약 후 30일 안에 신고되므로, 신고 기한이 지나 거래가 모두 모인 가장 최근 달을 기준으로 합니다.
        </p> */}
        <h1 className="mt-2 text-[40px] leading-[1.08] font-semibold sm:text-[56px]">서울, 한눈에.</h1>
        <p className="mx-auto mt-4 max-w-xl text-[19px] leading-snug text-muted-foreground sm:text-[21px]">
          25개 구의 시세와 특징, 그리고 내가 체크한 단지의 가격 변화까지.
        </p>
      </section>

      <section className="bg-muted px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-[1024px]">
          <MapExplorer
            districts={districts}
            highlights={highlights}
            memos={memos}
            markers={markers}
            initialWatch={watchItems}
          />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1024px]">
          <h2 className="text-center text-[28px] leading-tight font-semibold sm:text-[40px]">이번 달 눈여겨볼 곳.</h2>
          {/* 모바일에서도 네 장을 한눈에: 2×2 */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-4">
            <Tile index={0} eyebrow="서울 평균" title={<CountUp value={seoulAvg} suffix="만" />} caption="3.3㎡당 매매 · 25개 구 평균" />
            <Tile
              index={1}
              eyebrow="1년 상승률 1위"
              title={topGrowth.name}
              caption={<Change value={topGrowth.change12m} />}
            />
            <Tile index={2} eyebrow="가장 비싼 구" title={topPrice.name} caption={`3.3㎡당 ${formatManwon(topPrice.salePerPyeong)}`} />
            <Tile index={3} eyebrow="전세가율 1위" title={topJeonse.name} caption={`${topJeonse.jeonseRatio.toFixed(1)}%`} />
          </div>
        </div>
      </section>
    </>
  )
}

function Tile({
  index,
  eyebrow,
  title,
  caption,
}: {
  index: number
  eyebrow: string
  title: React.ReactNode
  caption: React.ReactNode
}) {
  return (
    <Reveal delay={index * 0.08} className="h-full">
      <TiltCard className="h-full rounded-[20px] bg-muted px-4 py-4 sm:rounded-[28px] sm:px-6 sm:py-8">
        <p className="text-[12px] font-medium text-muted-foreground sm:text-[13px]">{eyebrow}</p>
        <p className="tabular mt-1 text-[20px] leading-tight font-semibold sm:mt-2 sm:text-[28px]">{title}</p>
        <p className="mt-1 text-[13px] text-foreground/80 sm:mt-2 sm:text-[15px]">{caption}</p>
      </TiltCard>
    </Reveal>
  )
}
