// trade → district_monthly 집계. 3.3㎡당 평균가(만원) = 평균(가격 ÷ 전용면적 × 3.3058)
// 매매는 해제 거래, 전세는 갱신 계약을 뺀다.

import { sql } from "drizzle-orm"
import type { Database } from "./store"

export async function rebuildDistrictMonthly(db: Database, months: string[]) {
  if (months.length === 0) return
  await db.execute(sql`
    insert into district_monthly (district_code, month, sale, jeonse, sale_count, jeonse_count)
    select
      c.district_code,
      to_char(t.contract_date, 'YYYY-MM') as month,
      round(avg(t.price / t.area * 3.3058) filter (where t.deal_type = 'sale' and not t.is_cancelled))::int,
      round(avg(t.price / t.area * 3.3058) filter (where t.deal_type = 'jeonse' and not t.is_renewal))::int,
      count(*) filter (where t.deal_type = 'sale' and not t.is_cancelled)::int,
      count(*) filter (where t.deal_type = 'jeonse' and not t.is_renewal)::int
    from trade t
    join complex c on c.id = t.complex_id
    where to_char(t.contract_date, 'YYYY-MM') in ${months}
    group by 1, 2
    on conflict (district_code, month) do update set
      sale = excluded.sale,
      jeonse = excluded.jeonse,
      sale_count = excluded.sale_count,
      jeonse_count = excluded.jeonse_count
  `)
}
