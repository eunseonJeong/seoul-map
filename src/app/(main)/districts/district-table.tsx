"use client"

import { useMemo, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { Change } from "@/components/change"
import { formatManwon } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { District } from "@/lib/types"

type Key = "name" | "salePerPyeong" | "jeonsePerPyeong" | "jeonseRatio" | "change3m" | "change12m" | "weeklyChange"

const COLUMNS: { key: Key; label: string; render: (d: District) => React.ReactNode }[] = [
  { key: "salePerPyeong", label: "3.3㎡당 매매", render: (d) => formatManwon(d.salePerPyeong) },
  { key: "jeonsePerPyeong", label: "3.3㎡당 전세", render: (d) => formatManwon(d.jeonsePerPyeong) },
  { key: "jeonseRatio", label: "전세가율", render: (d) => `${d.jeonseRatio.toFixed(1)}%` },
  { key: "weeklyChange", label: "주간", render: (d) => <Change value={d.weeklyChange} digits={2} /> },
  { key: "change3m", label: "3개월", render: (d) => <Change value={d.change3m} /> },
  { key: "change12m", label: "1년", render: (d) => <Change value={d.change12m} /> },
]

export function DistrictTable({ districts }: { districts: District[] }) {
  const [sortKey, setSortKey] = useState<Key>("salePerPyeong")
  const [desc, setDesc] = useState(true)

  const rows = useMemo(() => {
    return [...districts].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const c = typeof av === "string" ? av.localeCompare(bv as string, "ko") : (av as number) - (bv as number)
      return desc ? -c : c
    })
  }, [districts, sortKey, desc])

  function toggle(key: Key) {
    if (key === sortKey) setDesc((d) => !d)
    else {
      setSortKey(key)
      setDesc(key !== "name")
    }
  }

  return (
    <div className="overflow-x-auto rounded-[28px] bg-muted p-2 sm:p-4">
      <table className="w-full min-w-[720px] text-[14px]">
        <thead>
          <tr className="text-[12px] text-muted-foreground">
            <th className="px-3 py-3 text-left font-normal">
              <SortButton active={sortKey === "name"} desc={desc} onClick={() => toggle("name")}>
                구
              </SortButton>
            </th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-3 py-3 text-right font-normal">
                <SortButton active={sortKey === c.key} desc={desc} onClick={() => toggle(c.key)} alignRight>
                  {c.label}
                </SortButton>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((d, i) => (
            <tr key={d.code} className="border-t border-black/5 transition hover:bg-white/70">
              <td className="px-3 py-3">
                <span className="mr-3 inline-block w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                <span className="font-medium">{d.name}</span>
              </td>
              {COLUMNS.map((c) => (
                <td key={c.key} className={cn("px-3 py-3 text-right", c.key === sortKey && "font-semibold")}>
                  {c.render(d)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SortButton({
  active,
  desc,
  onClick,
  children,
  alignRight,
}: {
  active: boolean
  desc: boolean
  onClick: () => void
  children: React.ReactNode
  alignRight?: boolean
}) {
  const Icon = desc ? ArrowDownIcon : ArrowUpIcon
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 transition hover:text-foreground",
        active && "font-medium text-foreground",
        alignRight && "flex-row-reverse",
      )}
    >
      {children}
      <Icon className={cn("size-3", active ? "opacity-100" : "opacity-0")} />
    </button>
  )
}
