"use client"

import { Loader2, RefreshCw, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PaymentMethod } from "@/domains/payments"
import { useLocale } from "@/hooks/use-locale"

type PaymentPendingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: PaymentMethod
  amountText: string
  onRefresh: () => void
  checking: boolean
}

export function PaymentPendingDialog({
  open,
  onOpenChange,
  method,
  amountText,
  onRefresh,
  checking,
}: PaymentPendingDialogProps) {
  const { t } = useLocale()

  const instruction =
    method === "orange_money"
      ? t("sp_pending_instruction_orange")
      : method === "mtn_momo"
        ? t("sp_pending_instruction_mtn")
        : t("sp_pending_instruction_generic")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b bg-amber-500/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
              <Smartphone className="size-5" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base">{t("sp_pending_title")}</DialogTitle>
              <DialogDescription className="text-xs">{t("sp_pending_badge")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-foreground">{amountText}</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{instruction}</p>
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/20 px-5 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={checking}>
            {t("sp_pending_close")}
          </Button>
          <Button type="button" onClick={onRefresh} disabled={checking}>
            {checking ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            {checking ? t("sp_pending_checking") : t("sp_pending_refresh")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
