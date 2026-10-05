// 구별 부동산 관련 기사 수집 (NAVER API HUB 뉴스 검색).
// 검색어를 주제별로 나눠 부르고, 제목에 부동산 키워드와 해당 지역이 함께 나오는 기사만 남긴다.
// 지역 판정: 제목에 구 이름(강남구)이 있거나, 제목에 줄임말(강남)·동 이름(대치동)이 있고 요약에 구 이름이 있을 때.

import { lt, sql } from "drizzle-orm"
import { complex, district, districtNews } from "@/db/schema"
import type { Database } from "./store"

const ENDPOINT = "https://naverapihub.apigw.ntruss.com/search/v1/news"
const TOPICS = ["아파트 시세", "집값", "재건축", "재개발", "분양"]
const KEEP_DAYS = 30
// 다른 광역시에도 같은 이름의 구가 있어서 '서울'이 함께 나와야 하고, 줄임말(중·강서)은 쓰지 않는 구
const AMBIGUOUS = new Set(["중구", "강서구"])
const REAL_ESTATE = /아파트|재건축|재개발|분양|청약|매매|전세|월세|집값|시세|부동산|정비사업|실거래|입주|공시가/

interface NaverNewsItem {
  title: string
  originallink: string
  link: string
  description: string
  pubDate: string
}

async function searchNews(query: string): Promise<NaverNewsItem[]> {
  const id = process.env.NAVER_SEARCH_CLIENT_ID
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET
  if (!id || !secret) throw new Error("NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 환경변수를 설정하세요.")
  const url = new URL(ENDPOINT)
  url.search = new URLSearchParams({ query, display: "100", sort: "date" }).toString()
  const res = await fetch(url, {
    headers: { "X-NCP-APIGW-API-KEY-ID": id, "X-NCP-APIGW-API-KEY": secret },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`뉴스 검색 API 오류 (${query}): HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).items ?? []
}

function clean(s: string) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim()
}

/** 글자 2-gram 집합 (공백·기호 제외) */
function bigrams(text: string) {
  const t = text.replace(/[^\p{L}\p{N}]/gu, "")
  return new Set(Array.from({ length: Math.max(t.length - 1, 0) }, (_, i) => t.slice(i, i + 2)))
}

/** 겹치는 2-gram 비율 (짧은 쪽 기준) */
function similarity(a: Set<string>, b: Set<string>) {
  let common = 0
  for (const g of a) if (b.has(g)) common++
  return common / Math.max(Math.min(a.size, b.size), 1)
}

export async function updateDistrictNews(db: Database, now = new Date()) {
  const gus = await db.select({ code: district.code, name: district.name }).from(district)
  const dongRows = await db.selectDistinct({ code: complex.districtCode, dong: complex.dong }).from(complex)
  const since = now.getTime() - KEEP_DAYS * 86_400_000
  let saved = 0

  for (const gu of gus) {
    const place = AMBIGUOUS.has(gu.name) ? `서울 ${gu.name}` : gu.name
    // 줄임말(강남)과 동 이름(대치동). 동 이름은 실거래 단지 주소에서 가져온다
    const aliases = [
      ...(AMBIGUOUS.has(gu.name) ? [] : [gu.name.replace(/구$/, "")]),
      ...dongRows.filter((d) => d.code === gu.code && d.dong.endsWith("동")).map((d) => d.dong),
    ]
    const isAbout = (title: string, description: string) =>
      title.includes(gu.name) || (description.includes(gu.name) && aliases.some((a) => title.includes(a)))
    const rows = new Map<string, typeof districtNews.$inferInsert>()
    const seen: { title: Set<string>; description: Set<string> }[] = []

    for (const topic of TOPICS) {
      for (const item of await searchNews(`${place} ${topic}`)) {
        const title = clean(item.title)
        const description = clean(item.description)
        const text = `${title} ${description}`
        const publishedAt = new Date(item.pubDate)
        if (!(publishedAt.getTime() >= since)) continue
        if (!REAL_ESTATE.test(title)) continue
        if (!isAbout(title, description)) continue
        if (AMBIGUOUS.has(gu.name) && !text.includes("서울")) continue
        // 같은 보도자료를 여러 언론사가 제목만 바꿔 낸 경우 하나만 남긴다 (제목 또는 요약이 비슷하면 중복)
        const grams = { title: bigrams(title), description: bigrams(description) }
        if (seen.some((s) => similarity(s.title, grams.title) >= 0.5 || similarity(s.description, grams.description) >= 0.35)) continue
        seen.push(grams)
        const url = item.originallink || item.link
        rows.set(url, { districtCode: gu.code, title, description, url, publishedAt })
      }
    }

    if (rows.size) {
      const inserted = await db
        .insert(districtNews)
        .values([...rows.values()])
        .onConflictDoNothing()
        .returning({ id: districtNews.id })
      saved += inserted.length
    }
  }

  const removed = await db
    .delete(districtNews)
    .where(lt(districtNews.publishedAt, sql`now() - make_interval(days => ${KEEP_DAYS})`))
    .returning({ id: districtNews.id })
  return { saved, removed: removed.length }
}
