import { getDataAsOf, getDistricts } from "@/lib/api"
import { requireUser } from "@/lib/users"
import { DistrictsView } from "./districts-view"

export const metadata = { title: "구별 시세 · 모두 부동산" }

export default async function DistrictsPage() {
  const user = await requireUser()
  const [asOf, districts] = await Promise.all([getDataAsOf(), getDistricts(user.id)])
  return (
    <>
      <section className="px-4 pt-14 pb-10 text-center sm:pt-20">
        <h1 className="text-[40px] leading-[1.08] font-semibold sm:text-[56px]">구별 시세.</h1>
        <p className="mx-auto mt-4 max-w-xl text-[19px] text-muted-foreground sm:text-[21px]">
          25개 구를 표와 차트로 비교합니다. 구와 기간을 골라 볼 수 있습니다.
        </p>
      </section>
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-[1024px]">
          <DistrictsView districts={districts} asOf={asOf} />
        </div>
      </section>
    </>
  )
}
