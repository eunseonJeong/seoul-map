import { notFound } from "next/navigation"
import { getAreaMonthly, getComplex, getDistrict, getTrades } from "@/lib/api"
import { ComplexView } from "./complex-view"

export default async function ComplexPage(props: PageProps<"/complex/[id]">) {
  const { id } = await props.params
  const complex = await getComplex(id)
  if (!complex || complex.areas.length === 0) notFound()

  const district = await getDistrict(complex.districtCode)
  const byArea = await Promise.all(
    complex.areas.map(async (area) => {
      const [monthly, trades] = await Promise.all([getAreaMonthly(complex.id, area), getTrades(complex.id, area)])
      return { area, monthly, trades }
    }),
  )

  return <ComplexView complex={complex} districtName={district?.name ?? ""} byArea={byArea} />
}
