"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { authService } from "@/domains/auth"
import { useLocale } from "@/hooks/use-locale"
import { isCompletePin, PIN_LENGTH, PIN_SLOT_INDICES } from "@/lib/pin"

const pinSlotClass =
  "h-9 w-9 rounded-lg border-2 border-border bg-background text-sm font-semibold shadow-sm transition-all data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20 sm:h-10 sm:w-10"

interface StudentChangePinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Appelé après un changement de PIN réussi (avant la redirection login). */
  onSuccess?: () => void
}

export function StudentChangePinDialog({ open, onOpenChange, onSuccess }: StudentChangePinDialogProps) {
  const router = useRouter()
  const { t } = useLocale()
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [saving, setSaving] = useState(false)

  function resetFields() {
    setCurrentPin("")
    setNewPin("")
    setConfirmPin("")
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetFields()
    onOpenChange(next)
  }

  async function handleSave() {
    if (!isCompletePin(currentPin) || !isCompletePin(newPin) || !isCompletePin(confirmPin)) {
      toast({ title: t("adm_set_pin_len"), variant: "destructive" })
      return
    }
    if (newPin !== confirmPin) {
      toast({ title: t("adm_set_pin_mismatch"), variant: "destructive" })
      return
    }
    if (currentPin === newPin) {
      toast({ title: t("adm_set_pin_same"), variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      await authService.changePin(currentPin, newPin)
      onSuccess?.()
      authService.clearSession({ clearMockPinOverrides: false })
      resetFields()
      onOpenChange(false)
      router.replace("/login?pinChanged=1")
    } catch {
      toast({ title: t("adm_set_pin_fail"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base">{t("prof_pin_dialog_title")}</DialogTitle>
              <DialogDescription className="text-xs">{t("prof_pin_dialog_desc")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{t("current_pin")}</Label>
            <InputOTP maxLength={PIN_LENGTH} value={currentPin} onChange={setCurrentPin}>
              <InputOTPGroup className="flex flex-wrap justify-center gap-1.5">
                {PIN_SLOT_INDICES.map((i) => (
                  <InputOTPSlot key={i} index={i} className={pinSlotClass} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{t("new_pin")}</Label>
            <InputOTP maxLength={PIN_LENGTH} value={newPin} onChange={setNewPin}>
              <InputOTPGroup className="flex flex-wrap justify-center gap-1.5">
                {PIN_SLOT_INDICES.map((i) => (
                  <InputOTPSlot key={i} index={i} className={pinSlotClass} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{t("confirm_pin")}</Label>
            <InputOTP maxLength={PIN_LENGTH} value={confirmPin} onChange={setConfirmPin}>
              <InputOTPGroup className="flex flex-wrap justify-center gap-1.5">
                {PIN_SLOT_INDICES.map((i) => (
                  <InputOTPSlot key={i} index={i} className={pinSlotClass} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/20 px-5 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {t("btn_cancel")}
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t("adm_set_pin_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
