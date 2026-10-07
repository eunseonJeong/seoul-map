"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * next-themes 는 깜빡임을 막는 인라인 <script> 를 그린다. 이 스크립트는 서버 HTML 에서만 실행되면 되는데,
 * React 19 는 브라우저에서 <script> 를 그리면 경고를 낸다. 그래서 브라우저에서는 type 을 json 으로 바꿔
 * 실행되지 않는 데이터 태그로 둔다 (서버 HTML 의 스크립트는 그대로 실행된다).
 */
export function ThemeProvider(props: React.ComponentProps<typeof NextThemesProvider>) {
  const scriptProps = typeof window === "undefined" ? undefined : ({ type: "application/json" } as const)
  return <NextThemesProvider scriptProps={scriptProps} {...props} />
}
