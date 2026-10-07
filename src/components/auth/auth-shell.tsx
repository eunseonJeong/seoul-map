import Link from "next/link"

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: { text: string; href: string; label: string }
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-muted px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-[32px] font-semibold leading-tight">{title}</h1>
          <p className="mt-2 text-[17px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mt-8 rounded-[28px] bg-background p-6 shadow-sm">{children}</div>
        <p className="mt-6 text-center text-[14px] text-muted-foreground">
          {footer.text}{" "}
          <Link href={footer.href} className="text-link hover:underline">
            {footer.label}
          </Link>
        </p>
      </div>
    </main>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-medium text-foreground/80">{label}</span>
      {children}
      {hint && <span className="text-[12px]">{hint}</span>}
    </label>
  )
}

/** 로그인 뒤 돌아갈 경로: 같은 사이트 경로만 */
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/"
}
