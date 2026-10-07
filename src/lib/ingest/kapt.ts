// 단지 세대수: 국토교통부 공동주택관리정보시스템(K-apt) 단지 목록·기본정보.
// 실거래 단지(complex)와는 구·동·지번으로 잇고, 지번이 안 맞으면 같은 동에서 단지명으로 한 번 더 찾는다.
// K-apt 는 의무관리 단지(대체로 150세대 이상) 위주라 작은 단지는 매칭되지 않을 수 있다.

import { sql } from "drizzle-orm"
import { complex, district } from "@/db/schema"
import type { Database } from "./store"

const BASE = "https://apis.data.go.kr/1613000"

interface KaptListItem {
  kaptCode: string
  kaptName: string
  as2: string // 구
  as3: string // 동
}

interface KaptBasis {
  kaptCode: string
  kaptName: string
  kaptAddr: string // 서울특별시 강남구 대치동 316 은마아파트
  doroJuso: string | null
  kaptdaCnt: number | null // 세대수 (모르면 0)
  hoCnt: number | null
}

async function getJson(url: string) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      const json = await res.json()
      const header = json?.response?.header
      if (header?.resultCode !== "00") {
        throw new Error(header?.resultMsg ?? json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ?? `HTTP ${res.status}`)
      }
      return json.response.body
    } catch (e) {
      // 이 API 는 부하가 몰리면 'HTTP 에러'를 자주 돌려준다. 간격을 늘려 가며 다시 시도한다
      if (i >= 5) throw new Error(`K-apt API 오류: ${(e as Error).message}`)
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i))
    }
  }
}

function serviceKey() {
  const key = process.env.DATA_GO_KR_SERVICE_KEY
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY 환경변수를 설정하세요.")
  return encodeURIComponent(key)
}

async function fetchList(sigunguCode: string): Promise<KaptListItem[]> {
  const items: KaptListItem[] = []
  for (let page = 1; ; page++) {
    const body = await getJson(
      `${BASE}/AptListService4/getSigunguAptList4?serviceKey=${serviceKey()}&sigunguCode=${sigunguCode}&pageNo=${page}&numOfRows=500`,
    )
    const pageItems: KaptListItem[] = body.items ?? []
    items.push(...pageItems)
    if (pageItems.length < 500 || items.length >= Number(body.totalCount)) break
  }
  return items
}

async function fetchBasis(kaptCode: string): Promise<KaptBasis | null> {
  const body = await getJson(`${BASE}/AptBasisInfoServiceV5/getAphusBassInfoV5?serviceKey=${serviceKey()}&kaptCode=${kaptCode}`)
  return body.item ?? null
}

/** "서울특별시 강남구 대치동 316 은마아파트" → { dong: "대치동", jibun: "316" } */
function parseAddr(addr: string) {
  const m = /^서울특별시\s+\S+구\s+(\S+)\s+(산?\d+(?:-\d+)?)/.exec(addr ?? "")
  return m ? { dong: m[1], jibun: m[2] } : null
}

const normName = (name: string) => name.replace(/\(.*?\)/g, "").replace(/아파트|\s/g, "")

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const out: R[] = []
  let i = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

/** 구별로 받아 바로 저장한다. 목록을 못 받은 구는 건너뛰고 failedGus 로 돌려준다 (guCodes 로 그 구만 다시 실행). */
export async function updateComplexHouseholds(
  db: Database,
  { guCodes, onProgress }: { guCodes?: string[]; onProgress?: (msg: string) => void } = {},
) {
  const gus = (await db.select({ code: district.code, name: district.name }).from(district)).filter(
    (g) => !guCodes || guCodes.includes(g.code),
  )
  const complexes = await db
    .select({ id: complex.id, name: complex.name, districtCode: complex.districtCode, dong: complex.dong, address: complex.address })
    .from(complex)

  // 실거래 단지 주소 "서울 강남구 대치동 316" → 구|동|지번
  const byJibun = new Map<string, string[]>()
  const byName = new Map<string, string[]>()
  for (const c of complexes) {
    const jibun = c.address.split(" ").at(-1) ?? ""
    const push = (map: Map<string, string[]>, key: string) => map.set(key, [...(map.get(key) ?? []), c.id])
    push(byJibun, `${c.districtCode}|${c.dong}|${jibun}`)
    push(byName, `${c.districtCode}|${c.dong}|${normName(c.name)}`)
  }

  const result = { kaptTotal: 0, basisFailed: 0, matchedKapt: 0, complexesUpdated: 0, withHouseholds: 0, failedGus: [] as string[] }

  // 기본정보를 몰아 부른 직후에는 목록 요청이 막히곤 해서 목록부터 모두 받아 둔다
  const lists = new Map<string, KaptListItem[]>()
  for (const gu of gus) {
    try {
      lists.set(gu.code, await fetchList(gu.code))
    } catch (e) {
      result.failedGus.push(gu.code)
      onProgress?.(`${gu.name}: 단지 목록 실패 (${(e as Error).message}) — 건너뜀`)
    }
  }

  for (const gu of gus) {
    const list = lists.get(gu.code)
    if (!list) continue
    // 기본정보: 한 바퀴 돌고, 실패한 단지만 잠시 쉬었다가 한 번 더 천천히
    const failedCodes: string[] = []
    const fetched = await pool(list, 2, async (item) => {
      await new Promise((r) => setTimeout(r, 200)) // 요청 간격
      return fetchBasis(item.kaptCode).catch(() => {
        failedCodes.push(item.kaptCode)
        return null
      })
    })
    let basisFailed = 0
    if (failedCodes.length) {
      await new Promise((r) => setTimeout(r, 30_000))
      const retried = await pool(failedCodes, 1, async (code) => {
        await new Promise((r) => setTimeout(r, 500))
        return fetchBasis(code).catch(() => {
          basisFailed++
          return null
        })
      })
      fetched.push(...retried)
    }
    const basics = fetched

    const updates = new Map<string, { households: number | null; kaptCode: string; roadAddress: string | null }>()
    let matched = 0
    for (const b of basics) {
      if (!b) continue
      const addr = parseAddr(b.kaptAddr)
      if (!addr) continue
      const ids =
        byJibun.get(`${gu.code}|${addr.dong}|${addr.jibun}`) ?? byName.get(`${gu.code}|${addr.dong}|${normName(b.kaptName)}`)
      if (!ids) continue
      matched++
      const households = (b.kaptdaCnt ?? 0) > 0 ? Math.round(b.kaptdaCnt!) : (b.hoCnt ?? 0) > 0 ? b.hoCnt! : null
      for (const id of ids) {
        // 같은 지번에 K-apt 단지가 둘 이상이면 세대수가 큰 쪽을 남긴다
        const prev = updates.get(id)
        if (prev && (prev.households ?? 0) >= (households ?? 0)) continue
        updates.set(id, { households, kaptCode: b.kaptCode, roadAddress: b.doroJuso?.trim() || null })
      }
    }
    // 구별로 UPDATE 한 번 (단지마다 보내면 트랜잭션이 길어진다)
    if (updates.size) {
      const values = sql.join(
        [...updates].map(([id, u]) => sql`(${id}, ${u.households}::int, ${u.kaptCode}, ${u.roadAddress})`),
        sql`, `,
      )
      await db.execute(sql`
        update complex c
        set households = v.households, kapt_code = v.kapt_code, road_address = v.road_address
        from (values ${values}) as v(id, households, kapt_code, road_address)
        where c.id = v.id`)
    }

    result.kaptTotal += list.length
    result.basisFailed += basisFailed
    result.matchedKapt += matched
    result.complexesUpdated += updates.size
    result.withHouseholds += [...updates.values()].filter((u) => u.households != null).length
    onProgress?.(`${gu.name}: K-apt ${list.length}곳 중 ${matched}곳 연결 (기본정보 실패 ${basisFailed})`)
  }
  return result
}
