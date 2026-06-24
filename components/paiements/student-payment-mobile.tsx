"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { PhoneInputField } from "@/components/ui/phone-input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouteLoader } from "@/components/route-loader"
import type { PaymentMethod, StudentPaymentRecord, StudentTuitionSummary } from "@/domains/payments"
import { useLocale } from "@/hooks/use-locale"
import { validatePhoneE164 } from "@/lib/phone-validation"
import { cn } from "@/lib/utils"

const METHODS: {
  id: PaymentMethod
  labelKey: "sp_method_om" | "sp_method_mtn"
  shortKey: "sp_mob_om_short" | "sp_mob_mtn_short"
  accent: string
  ring: string
  needsPhone: boolean
}[] = [
  {
    id: "orange_money",
    labelKey: "sp_method_om",
    shortKey: "sp_mob_om_short",
    accent: "from-orange-500 to-orange-600",
    ring: "ring-orange-500/40",
    needsPhone: true,
  },
  {
    id: "mtn_momo",
    labelKey: "sp_method_mtn",
    shortKey: "sp_mob_mtn_short",
    accent: "from-amber-400 to-yellow-500",
    ring: "ring-amber-500/40",
    needsPhone: true,
  },
]

type StudentPaymentMobileProps = {
  summary: StudentTuitionSummary
  loading?: boolean
  formatFcfa: (value: number) => string
  progressPercent: number
  amountInput: string
  setAmountInput: (value: string) => void
  method: PaymentMethod
  setMethod: (method: PaymentMethod) => void
  phone: string
  setPhone: (value: string) => void
  note: string
  setNote: (value: string) => void
  remainingAfterInput: number
  submitting: boolean
  message: { type: "success" | "error" | "pending"; text: string } | null
  lastPayment: StudentPaymentRecord | null
  onSubmit: () => void
  onDownloadReceipt: () => void
  onShowPending?: () => void
  defaultPhone?: string | null
}

export function StudentPaymentMobile({
  summary,
  loading = false,
  formatFcfa,
  progressPercent,
  amountInput,
  setAmountInput,
  method,
  setMethod,
  phone,
  setPhone,
  note,
  setNote,
  remainingAfterInput,
  submitting,
  message,
  lastPayment,
  onSubmit,
  onDownloadReceipt,
  onShowPending,
  defaultPhone,
}: StudentPaymentMobileProps) {
  const router = useRouter()
  const { startLoading } = useRouteLoader()
  const { t } = useLocale()
  const [noteOpen, setNoteOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  useEffect(() => {
    if (!phone && defaultPhone) setPhone(defaultPhone)
  }, [defaultPhone, phone, setPhone])

  useEffect(() => {
    if (message?.type === "success") setSuccessOpen(true)
  }, [message])

  const selectedMethod = METHODS.find((m) => m.id === method) ?? METHODS[0]
  const amountValue = Number(amountInput)
  const amountValid = Number.isFinite(amountValue) && amountValue > 0
  const phoneOk = !selectedMethod.needsPhone || validatePhoneE164(phone)
  const canSubmit =
    summary.remainingAmount > 0 && amountValid && amountValue <= summary.remainingAmount + 0.01 && phoneOk && !submitting

  const quickAmounts = useMemo(() => {
    const remain = summary.remainingAmount
    if (remain <= 0) return []
    const half = Math.round(remain / 2)
    const quarter = Math.round(remain / 4)
    return [
      { label: "25%", value: quarter },
      { label: "50%", value: half },
      { label: t("sp_mob_pay_all"), value: remain },
    ].filter((item, index, arr) => item.value > 0 && arr.findIndex((x) => x.value === item.value) === index)
  }, [summary.remainingAmount, t])

  const ctaLabel = useMemo(() => {
    if (submitting) return t("sp_submitting")
    if (amountValid) return t("sp_mob_pay_cta").replace("{amount}", formatFcfa(amountValue))
    return t("sp_submit")
  }, [submitting, amountValid, amountValue, formatFcfa, t])

  return (
    <div className="md:hidden flex min-h-0 flex-col px-4 pt-2 pb-1">
      <header className="sticky top-0 z-20 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-md">
        <div className="p-4 pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-primary-foreground hover:bg-white/15"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                startLoading()
                router.back()
                return
              }
              startLoading()
              router.push("/dashboard")
            }}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold">{t("sp_mob_title")}</h1>
            <p className="truncate text-xs text-primary-foreground/80">{summary.className}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-black/15 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-primary-foreground/70">
              {t("sp_card_remain")}
            </p>
            {loading ? (
              <Skeleton className="mt-1 h-6 w-24 bg-white/25" />
            ) : (
              <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{formatFcfa(summary.remainingAmount)}</p>
            )}
          </div>
          <div className="rounded-xl bg-emerald-500/20 px-3 py-2 backdrop-blur-sm ring-1 ring-emerald-300/25">
            <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-100/90">
              {t("sp_card_paid")}
            </p>
            {loading ? (
              <Skeleton className="mt-1 h-6 w-24 bg-white/25" />
            ) : (
              <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-50">
                {formatFcfa(summary.amountPaid)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] text-primary-foreground/80">
            <span>{t("sp_progress")}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 pb-36 pt-4">
        {message?.type === "error" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {message.text}
          </div>
        ) : null}

        {message?.type === "pending" ? (
          <button
            type="button"
            onClick={onShowPending}
            className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-left text-sm text-amber-700 dark:text-amber-400"
          >
            {message.text}
          </button>
        ) : null}

        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t("sp_label_amount")}</p>
          <div className="relative mt-2">
            <Input
              id="payment-amount-mobile"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              max={summary.remainingAmount}
              className="h-14 border-0 bg-muted/40 text-center text-3xl font-bold tabular-nums shadow-none focus-visible:ring-primary/30"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              F CFA
            </span>
          </div>

          {quickAmounts.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAmounts.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setAmountInput(String(chip.value))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    amountInput === String(chip.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40",
                  )}
                >
                  {chip.label}
                  <span className="ml-1 text-muted-foreground tabular-nums">
                    {formatFcfa(chip.value).replace(" F CFA", "")}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section>
          <p className="mb-2 px-0.5 text-xs font-medium text-muted-foreground">{t("sp_mob_method")}</p>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((item) => {
              const active = method === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMethod(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all active:scale-[0.98]",
                    active
                      ? cn("border-transparent bg-gradient-to-br text-white shadow-md ring-2", item.accent, item.ring)
                      : "border-border bg-card text-foreground hover:border-primary/30",
                  )}
                >
                  <Smartphone className={cn("size-5", active ? "text-white" : "text-orange-600")} />
                  <span className="text-[11px] font-semibold leading-tight">{t(item.shortKey)}</span>
                </button>
              )
            })}
          </div>
        </section>

        {selectedMethod.needsPhone ? (
          <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <LabelRow label={t("sp_label_phone")} hint={t("sp_mob_phone_hint")} />
            <PhoneInputField
              id="phone-number-mobile"
              value={phone}
              onChange={setPhone}
              placeholder={t("sp_ph_phone")}
              invalid={phone.length > 0 && !validatePhoneE164(phone)}
              className="mt-2"
            />
          </section>
        ) : null}

        <Collapsible open={noteOpen} onOpenChange={setNoteOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm font-medium text-muted-foreground"
            >
              {t("sp_mob_note_toggle")}
              <ChevronDown className={cn("size-4 transition-transform", noteOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Input
              id="payment-note-mobile"
              placeholder={t("sp_ph_note")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11"
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="pointer-events-none fixed bottom-[4.25rem] left-4 right-4 z-30 mx-auto max-w-lg">
        <div className="pointer-events-auto rounded-2xl border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("sp_remain_after")}</span>
            <span className="font-bold tabular-nums text-foreground">{formatFcfa(remainingAfterInput)}</span>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-xl text-base font-semibold shadow-lg"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {submitting ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
            {ctaLabel}
          </Button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3 text-primary" />
            {t("sp_mob_secure_short")}
          </p>
        </div>
      </div>

      <Sheet open={successOpen} onOpenChange={setSuccessOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <CircleCheck className="size-5 text-emerald-600" />
              {t("sp_success_badge")}
            </SheetTitle>
          </SheetHeader>
          <p className="mt-2 text-sm text-muted-foreground">{message?.text ?? t("sp_msg_ok")}</p>
          {lastPayment ? (
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatFcfa(lastPayment.amount)}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2">
            <Button className="h-11 rounded-xl" onClick={onDownloadReceipt} disabled={!lastPayment}>
              <ReceiptText className="mr-2 size-4" />
              {t("sp_download")}
            </Button>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setSuccessOpen(false)}>
              {t("sp_mob_done")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function LabelRow({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
