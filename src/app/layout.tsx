import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { MotionProvider } from "@/components/motion"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

export const metadata: Metadata = {
  title: "모두 부동산 - 서울 부동산 정보 플랫폼",
  description: "서울 25개 구의 시세와 특징을 지도에서 보고, 관심 단지의 가격 변동을 추적합니다.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes 가 그리기 전에 html 에 dark 클래스를 붙이므로 경고를 끈다
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <MotionProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </MotionProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
