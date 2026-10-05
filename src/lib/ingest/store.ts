// 수집한 거래를 DB 에 넣는다. 구·월·거래유형 단위로 지우고 다시 넣어서
// 나중에 들어온 신고·해제(취소)도 그대로 반영된다.

import { and, eq, gte, inArray, lt, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import * as schema from "@/db/schema"
import type { DealType } from "@/lib/types"
import type { MonthDeals } from "./molit"

export type Database = PostgresJsDatabase<typeof schema>

const { complex, complexArea, ingestLog, trade } = schema
const CHUNK = 1000

export async function saveMonthDeals(
  db: Database,
  { districtCode, month, dealType, deals }: { districtCode: string; month: string; dealType: DealType; deals: MonthDeals },
) {
  await db.transaction(async (tx) => {
    for (const rows of chunks(deals.complexes)) {
      const insert = tx.insert(complex).values(rows)
      // 단지명·주소는 매매 자료 기준으로 갱신하고, 전세 자료는 새 단지만 추가한다
      await (dealType === "sale"
        ? insert.onConflictDoUpdate({
            target: complex.id,
            set: {
              name: sql`excluded.name`,
              dong: sql`excluded.dong`,
              address: sql`excluded.address`,
              builtYear: sql`coalesce(excluded.built_year, ${complex.builtYear})`,
            },
          })
        : insert.onConflictDoNothing())
    }
    for (const rows of chunks(deals.areas)) {
      await tx.insert(complexArea).values(rows).onConflictDoNothing()
    }

    await tx
      .delete(trade)
      .where(
        and(
          eq(trade.dealType, dealType),
          gte(trade.contractDate, `${month}-01`),
          lt(trade.contractDate, `${nextMonth(month)}-01`),
          inArray(trade.complexId, tx.select({ id: complex.id }).from(complex).where(eq(complex.districtCode, districtCode))),
        ),
      )
    for (const rows of chunks(deals.trades)) {
      await tx.insert(trade).values(rows)
    }

    await tx
      .insert(ingestLog)
      .values({ districtCode, month, dealType, rowCount: deals.trades.length })
      .onConflictDoUpdate({
        target: [ingestLog.districtCode, ingestLog.month, ingestLog.dealType],
        set: { rowCount: deals.trades.length, fetchedAt: sql`now()` },
      })
  })
}

/** 'YYYY-MM' 다음 달 */
export function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
}

function* chunks<T>(rows: T[]) {
  for (let i = 0; i < rows.length; i += CHUNK) yield rows.slice(i, i + CHUNK)
}
