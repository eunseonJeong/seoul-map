import { getDistricts } from "@/lib/api"
import { requireUser } from "@/lib/users"
import { DistrictTable } from "./district-table"

export const metadata = { title: "구별 시세 · 서울 부동산" }

export default async function DistrictsPage() {
  const user = await requireUser()
  const districts = await getDistricts(user.id)
  return (
    <>
      <section className="px-4 pt-14 pb-10 text-center sm:pt-20">
        <h1 className="text-[40px] leading-[1.08] font-semibold sm:text-[56px]">구별 시세.</h1>
        <p className="mx-auto mt-4 max-w-xl text-[19px] text-muted-foreground sm:text-[21px]">
          25개 구를 한 표에서 비교합니다. 머리글을 누르면 정렬됩니다.
        </p>
      </section>
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-[1024px]">
          <DistrictTable districts={districts} />
        </div>
      </section>
    </>
  )
}
