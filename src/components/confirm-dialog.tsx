"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "@/components/ui/button"

/** 되돌리기 어려운 동작(삭제·로그아웃 등) 전에 한 번 더 묻는 모달 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-[360px] -translate-x-1/2 -translate-y-1/2 gap-2 rounded-2xl bg-popover p-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.18)] outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <AlertDialog.Title className="text-[17px] font-semibold">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="text-[14px] leading-relaxed text-muted-foreground">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <AlertDialog.Close render={<Button variant="outline" className="h-10" disabled={pending} />}>취소</AlertDialog.Close>
            <Button
              variant={destructive ? "destructive" : "default"}
              className={destructive ? "h-10 bg-destructive text-white hover:bg-destructive/90" : "h-10"}
              disabled={pending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
