import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { MapExplorer } from "@/components/map-explorer"
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
        <p className="text-[14px] font-semibold text-[#bf4800]">{monthLong(asOf)} 기준</p>
        <h1 className="mt-2 text-[40px] leading-[1.08] font-semibold sm:text-[56px]">서울, 한눈에.</h1>
        <p className="mx-auto mt-4 max-w-xl text-[19px] leading-snug text-muted-foreground sm:text-[21px]">
          25개 구의 시세와 특징, 그리고 내가 체크한 단지의 가격 변화까지.
        </p>
        <div className="mt-6 flex items-center justify-center gap-6 text-[17px]">
          <Link href="/watchlist" className="group inline-flex items-center text-link hover:underline">
            관심 단지 보기
            <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/districts" className="group inline-flex items-center text-link hover:underline">
            구별 시세
            <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
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
          <h2 className="text-center text-[32px] leading-tight font-semibold sm:text-[40px]">이번 달 눈여겨볼 곳.</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Tile eyebrow="서울 평균" title={formatManwon(seoulAvg)} caption={`3.3㎡당 매매 · 25개 구 단순 평균 · ${monthLong(asOf)}`} />
            <Tile
              eyebrow="1년 상승률 1위"
              title={topGrowth.name}
              caption={<Change value={topGrowth.change12m} />}
            />
            <Tile eyebrow="가장 비싼 구" title={topPrice.name} caption={`3.3㎡당 ${formatManwon(topPrice.salePerPyeong)}`} />
            <Tile eyebrow="전세가율 1위" title={topJeonse.name} caption={`${topJeonse.jeonseRatio.toFixed(1)}%`} />
          </div>
        </div>
      </section>
    </>
  )
}

function Tile({ eyebrow, title, caption }: { eyebrow: string; title: string; caption: React.ReactNode }) {
  return (
    <div className="rounded-[28px] bg-muted px-6 py-8">
      <p className="text-[13px] font-medium text-muted-foreground">{eyebrow}</p>
      <p className="tabular mt-2 text-[28px] leading-tight font-semibold">{title}</p>
      <p className="mt-2 text-[15px] text-foreground/80">{caption}</p>
    </div>
  )
}
