"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, CircleAlert, CreditCard, CircleCheck, ReceiptText, ShieldCheck, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StudentStatCard } from "@/components/student/student-stat-card"
import { ScholarshipBanner } from "@/components/student/scholarship-banner"
import { DataLoadError } from "@/components/student/data-load-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MobileBackButton } from "@/components/mobile-back-button"
import { PhoneInputField } from "@/components/ui/phone-input"
import { formatPhoneE164, validatePhoneE164 } from "@/lib/phone-validation"
import { PaymentMethodPicker, paymentMethodNeedsPhone } from "@/components/paiements/payment-method-picker"
import { StudentPaymentMobile } from "@/components/paiements/student-payment-mobile"
import { PaymentPendingDialog } from "@/components/paiements/payment-pending-dialog"
import {
  paymentsService,
  type PaymentMethod,
  type StudentPaymentRecord,
  type StudentTuitionSummary,
} from "@/domains/payments"
import { ApiClientError } from "@/core/api/client"
import { formatFcfaForPdf, sanitizeTextForPdf } from "@/lib/pdf-text"
import { CACHE_KEYS, getCached, hasCached, setCached } from "@/lib/client-cache"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"

const DEFAULT_SUMMARY: StudentTuitionSummary = {
  studentName: "Etudiant Demo",
  className: "A1",
  totalTuition: 0,
  amountPaid: 0,
  remainingAmount: 0,
}

const PENDING_AUTO_VERIFY_DELAY_MS = 15000
const PENDING_AUTO_VERIFY_MAX_ATTEMPTS = 3

type PendingVerifyResult = "success" | "failed" | "pending"

function useFormatFcfa(locale: string) {
  return (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} F CFA`
}

export default function EffectuerPaiementPage() {
  const { t, locale } = useLocale()
  const router = useRouter()
  const { phone: sessionPhone } = useAuth()
  const formatFcfa = useMemo(() => useFormatFcfa(locale), [locale])

  const redirectToPayments = () => {
    // Laisse le temps de voir le message de confirmation avant la redirection.
    setTimeout(() => router.push("/dashboard/mes-paiements"), 1200)
  }

  const [summary, setSummary] = useState<StudentTuitionSummary>(
    () => getCached<StudentTuitionSummary>(CACHE_KEYS.paymentsSummary) ?? DEFAULT_SUMMARY,
  )
  const [amountInput, setAmountInput] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("orange_money")
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error" | "pending"; text: string } | null>(null)
  const [lastPayment, setLastPayment] = useState<StudentPaymentRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingOpen, setPendingOpen] = useState(false)
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod>("orange_money")
  const [checkingStatus, setCheckingStatus] = useState(false)
  const verifyingRef = useRef(false)
  const [loading, setLoading] = useState(() => !hasCached(CACHE_KEYS.paymentsSummary))
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    let ok = false
    try {
      const next = await paymentsService.getSummary()
      setSummary(next)
      setCached(CACHE_KEYS.paymentsSummary, next)
      ok = true
    } catch {
      // La synthèse pilote le formulaire (montant restant) : sans elle la page est inutilisable.
    }
    setLoading(false)
    setError(!ok && !hasCached(CACHE_KEYS.paymentsSummary))
  }, [])

  useEffect(() => {
    void load()
    window.addEventListener("student-payments-updated", load)
    return () => window.removeEventListener("student-payments-updated", load)
  }, [load])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    await load()
    setRetrying(false)
  }, [load])

  useEffect(() => {
    if (!phone && sessionPhone) setPhone(sessionPhone)
  }, [sessionPhone, phone])

  const remainingAfterInput = useMemo(() => {
    const amount = Number(amountInput || "0")
    if (!Number.isFinite(amount) || amount <= 0) return summary.remainingAmount
    return Math.max(summary.remainingAmount - amount, 0)
  }, [amountInput, summary.remainingAmount])

  const progressPercent = useMemo(() => {
    if (summary.totalTuition <= 0) return 0
    return Math.min((summary.amountPaid / summary.totalTuition) * 100, 100)
  }, [summary.amountPaid, summary.totalTuition])

  const submitPayment = async () => {
    if (submitting) return
    const amount = Number(amountInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: "error", text: t("sp_err_amount") })
      return
    }
    if (paymentMethodNeedsPhone(method) && !validatePhoneE164(phone)) {
      setMessage({ type: "error", text: t("sp_mob_phone_required") })
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const payment = await paymentsService.createPayment({
        amount,
        paymentMethod: method,
        phoneNumber: phone ? formatPhoneE164(phone) : undefined,
        note,
      })
      setLastPayment(payment)
      setSummary(await paymentsService.getSummary())

      if (payment.status === "pending") {
        // Mobile Money : le paiement attend la confirmation sur le telephone.
        setPendingMethod(method)
        setPendingOpen(true)
        setMessage({ type: "pending", text: t("sp_msg_pending") })
      } else if (payment.status === "failed" || payment.status === "cancelled") {
        setMessage({ type: "error", text: t("sp_err_failed") })
        redirectToPayments()
      } else {
        // successful (ou mock sans statut) : on considere le paiement abouti.
        setAmountInput("")
        setPhone("")
        setNote("")
        setMessage({ type: "success", text: t("sp_msg_ok") })
        redirectToPayments()
      }
    } catch (error) {
      let code = error instanceof Error ? error.message : "UNKNOWN"

      if (error instanceof ApiClientError) {
        const payload = error.payload as Record<string, unknown> | null
        const candidate =
          payload?.code ??
          payload?.errorCode ??
          payload?.type ??
          payload?.error ??
          payload?.message
        if (typeof candidate === "string") code = candidate
      }

      if (code === "AMOUNT_EXCEEDS_REMAINING") {
        setMessage({ type: "error", text: t("sp_err_exceed") })
      } else if (code === "INVALID_AMOUNT") {
        setMessage({ type: "error", text: t("sp_err_amount") })
      } else if (code === "PHONE_REQUIRED") {
        setMessage({ type: "error", text: t("sp_mob_phone_required") })
      } else if (code === "UNSUPPORTED_PAYMENT_METHOD") {
        setMessage({ type: "error", text: t("sp_err_generic") })
      } else {
        setMessage({ type: "error", text: t("sp_err_generic") })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const applyPendingVerifyResult = useCallback(
    (updated: StudentPaymentRecord, outcome: string): PendingVerifyResult => {
      if (
        outcome === "failed" ||
        outcome === "cancelled" ||
        updated.status === "failed" ||
        updated.status === "cancelled"
      ) {
        setPendingOpen(false)
        setMessage({ type: "error", text: t("sp_err_failed") })
        redirectToPayments()
        return "failed"
      }

      if (outcome === "settled" || outcome === "already_settled" || updated.status === "successful") {
        setPendingOpen(false)
        setAmountInput("")
        setPhone("")
        setNote("")
        setMessage({ type: "success", text: t("sp_msg_ok") })
        redirectToPayments()
        return "success"
      }

      setMessage({ type: "pending", text: t("sp_msg_pending") })
      return "pending"
    },
    [t],
  )

  const verifyPendingPayment = useCallback(
    async (paymentId: string): Promise<PendingVerifyResult | null> => {
      if (verifyingRef.current) return null
      verifyingRef.current = true
      setCheckingStatus(true)
      try {
        const { payment: updated, outcome } = await paymentsService.verifyPayment(paymentId)
        setLastPayment(updated)
        setSummary(await paymentsService.getSummary())
        window.dispatchEvent(new Event("student-payments-updated"))
        return applyPendingVerifyResult(updated, outcome)
      } catch {
        return "pending"
      } finally {
        verifyingRef.current = false
        setCheckingStatus(false)
      }
    },
    [applyPendingVerifyResult],
  )

  const checkPendingStatus = async () => {
    if (!lastPayment || checkingStatus) return
    await verifyPendingPayment(lastPayment.paymentId)
  }

  useEffect(() => {
    if (!pendingOpen || !lastPayment?.paymentId || lastPayment.status !== "pending") return

    const paymentId = lastPayment.paymentId
    let cancelled = false
    let attempts = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = (result: PendingVerifyResult | null) => {
      if (cancelled || result === "success" || result === "failed" || result === null) return
      if (attempts >= PENDING_AUTO_VERIFY_MAX_ATTEMPTS) return
      timeoutId = setTimeout(() => {
        void runAttempt()
      }, PENDING_AUTO_VERIFY_DELAY_MS)
    }

    const runAttempt = async () => {
      if (cancelled || attempts >= PENDING_AUTO_VERIFY_MAX_ATTEMPTS) return
      attempts += 1
      const result = await verifyPendingPayment(paymentId)
      scheduleNext(result)
    }

    timeoutId = setTimeout(() => {
      void runAttempt()
    }, PENDING_AUTO_VERIFY_DELAY_MS)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [pendingOpen, lastPayment?.paymentId, lastPayment?.status, verifyPendingPayment])

  const downloadReceipt = async () => {
    if (!lastPayment) return
    const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")

    const methodLabelPdf =
      lastPayment.paymentMethod === "orange_money"
        ? t("sp_method_om")
        : lastPayment.paymentMethod === "mtn_momo"
          ? t("sp_method_mtn")
          : t("sp_method_cash")

    const loc = locale === "en" ? "en-GB" : "fr-FR"
    const paymentDate = sanitizeTextForPdf(new Date(lastPayment.paidAt ?? lastPayment.createdAt).toLocaleString(loc))

    const logoDataUrl = await fetch("/images/logo.png")
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error("LOGO_READ_FAILED"))
            reader.readAsDataURL(blob)
          }),
      )
      .catch(() => "")

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const left = 16
    const right = pageWidth - 16

    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageWidth, 42, "F")

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", left, 8, 34, 12)
    }

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text(sanitizeTextForPdf(t("sp_pdf_title")), left, 28)
    doc.setFontSize(11)
    doc.text(sanitizeTextForPdf(`${t("sp_pdf_ref")} ${lastPayment.paymentId}`), left, 35)

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(11)

    let y = 56
    const row = (label: string, value: string) => {
      const safe = sanitizeTextForPdf(value)
      doc.setTextColor(71, 85, 105)
      doc.text(sanitizeTextForPdf(label), left, y)
      doc.setTextColor(15, 23, 42)
      doc.text(safe, right, y, { align: "right" })
      doc.setDrawColor(226, 232, 240)
      doc.line(left, y + 2, right, y + 2)
      y += 10
    }

    row(t("sp_pdf_student"), summary.studentName)
    row(t("sp_pdf_class"), summary.className)
    row(t("sp_pdf_date"), paymentDate)
    row(t("sp_pdf_method"), methodLabelPdf)
    row(t("sp_pdf_amount_paid"), formatFcfaForPdf(lastPayment.amount))
    row(t("sp_pdf_total_fees"), formatFcfaForPdf(summary.totalTuition))
    row(t("sp_pdf_total_paid"), formatFcfaForPdf(summary.amountPaid))
    row(t("sp_pdf_remain"), formatFcfaForPdf(summary.remainingAmount))

    doc.setFillColor(248, 250, 252)
    doc.roundedRect(left, y + 6, right - left, 18, 2, 2, "F")
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(10)
    doc.text(sanitizeTextForPdf(t("sp_pdf_footer")), left + 4, y + 17)

    doc.save(`recu-${lastPayment.paymentId}.pdf`)
  }

  if (error) {
    return <DataLoadError fullScreen onRetry={handleRetry} retrying={retrying} />
  }

  return (
    <>
      <StudentPaymentMobile
        summary={summary}
        loading={loading}
        formatFcfa={formatFcfa}
        progressPercent={progressPercent}
        amountInput={amountInput}
        setAmountInput={setAmountInput}
        method={method}
        setMethod={setMethod}
        phone={phone}
        setPhone={setPhone}
        note={note}
        setNote={setNote}
        remainingAfterInput={remainingAfterInput}
        submitting={submitting}
        message={message}
        lastPayment={lastPayment}
        onSubmit={submitPayment}
        onDownloadReceipt={downloadReceipt}
        onShowPending={() => setPendingOpen(true)}
        defaultPhone={sessionPhone}
      />

      <PaymentPendingDialog
        open={pendingOpen}
        onOpenChange={setPendingOpen}
        method={pendingMethod}
        amountText={lastPayment ? formatFcfa(lastPayment.amount) : ""}
        onRefresh={checkPendingStatus}
        checking={checkingStatus}
      />

      <div className="hidden space-y-6 p-4 md:block md:p-6">
        <MobileBackButton />
        <div
          className={`fixed top-16 left-1/2 z-[110] w-[92%] max-w-xl -translate-x-1/2 rounded-xl border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur transition-all duration-300 ${
            submitting || message ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
          } ${
            submitting
              ? "border-primary/30"
              : message?.type === "success"
                ? "border-green-500/25"
                : message?.type === "pending"
                  ? "border-amber-500/30"
                  : message?.type === "error"
                    ? "border-destructive/30"
                    : "border-border"
          }`}
        >
          {submitting ? (
            <div>
              <p className="text-sm font-medium text-foreground">{t("sp_processing")}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
          ) : message ? (
            <p
              className={`text-sm font-medium ${
                message.type === "success"
                  ? "text-green-700"
                  : message.type === "pending"
                    ? "text-amber-700"
                    : "text-destructive"
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
          <div className="p-5 md:p-6">
            <h1 className="text-xl font-bold md:text-2xl">{t("sp_title")}</h1>
            <p className="mt-1 text-sm text-primary-foreground/85">{t("sp_subtitle")}</p>
            <p className="mt-2 text-sm text-primary-foreground/90">
              {t("sp_class_line")} <span className="font-semibold">{summary.className}</span> — {t("sp_fees_total")}{" "}
              <span className="font-semibold">{formatFcfa(summary.totalTuition)}</span>
            </p>
          </div>
          <div className="bg-black/10 px-5 py-3 md:px-6">
            <div className="flex items-center justify-between text-xs text-primary-foreground/90">
              <span>{t("sp_progress")}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {summary.isScholarshipHolder ? (
          <div className="mt-4">
            <ScholarshipBanner summary={summary} />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StudentStatCard
            icon={<Wallet className="size-4" />}
            tone="indigo"
            label={t("sp_card_total")}
            value={formatFcfa(summary.totalTuition)}
            hint={summary.className}
            loading={loading}
          />
          <StudentStatCard
            icon={<CheckCircle2 className="size-4" />}
            tone="emerald"
            label={t("sp_card_paid")}
            value={formatFcfa(summary.amountPaid)}
            trend={summary.totalTuition > 0 ? { value: `${Math.round(progressPercent)}%`, positive: true } : undefined}
            loading={loading}
          />
          <StudentStatCard
            icon={<CircleAlert className="size-4" />}
            tone={summary.remainingAmount > 0 ? "rose" : "emerald"}
            label={t("sp_card_remain")}
            value={formatFcfa(summary.remainingAmount)}
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2 border-primary/15 shadow-sm overflow-hidden">
            {submitting ? (
              <div className="h-1 w-full overflow-hidden bg-primary/10">
                <div className="h-full w-1/2 animate-pulse bg-primary" />
              </div>
            ) : null}
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4 text-primary" />
                {t("sp_new_payment")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">{t("sp_label_amount")}</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder={t("sp_ph_amount")}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  max={summary.remainingAmount}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("sp_label_method")}</Label>
                <PaymentMethodPicker value={method} onChange={setMethod} />
              </div>

              {paymentMethodNeedsPhone(method) ? (
                <div className="space-y-2">
                  <Label htmlFor="phone-number">{t("sp_label_phone")}</Label>
                  <PhoneInputField
                    id="phone-number"
                    value={phone}
                    onChange={setPhone}
                    placeholder={t("sp_ph_phone")}
                    invalid={phone.length > 0 && !validatePhoneE164(phone)}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="payment-note">{t("sp_label_note")}</Label>
                <Input
                  id="payment-note"
                  placeholder={t("sp_ph_note")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {message ? (
                <div
                  className={
                    message.type === "success"
                      ? "rounded-xl border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
                      : message.type === "pending"
                        ? "rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
                        : "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  }
                >
                  {message.text}
                </div>
              ) : null}

              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm">
                <p className="text-muted-foreground">
                  {t("sp_remain_after")}{" "}
                  <span className="font-semibold text-foreground">{formatFcfa(remainingAfterInput)}</span>
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="sm:min-w-44" onClick={submitPayment} disabled={summary.remainingAmount <= 0 || submitting}>
                  {submitting ? t("sp_submitting") : t("sp_submit")}
                </Button>
                <Button
                  variant="outline"
                  disabled={submitting}
                  onClick={() => {
                    setAmountInput("")
                    setPhone("")
                    setNote("")
                    setMessage(null)
                  }}
                >
                  {t("sp_reset")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-primary/15 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("sp_result_title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {message?.type === "success" ? (
                  <div className="rounded-lg border border-green-500/25 bg-green-500/10 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                      <CircleCheck className="size-4" />
                      {t("sp_success_badge")}
                    </div>
                    <p className="mt-1 text-muted-foreground">{message.text}</p>
                  </div>
                ) : null}
                {message?.type === "pending" ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                      <CircleAlert className="size-4" />
                      {t("sp_pending_badge")}
                    </div>
                    <p className="mt-1 text-muted-foreground">{message.text}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setPendingOpen(true)}
                    >
                      {t("sp_pending_title")}
                    </Button>
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">{t("sp_status_hint")}</p>
              </CardContent>
            </Card>

            <Card className="border-primary/15 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("sp_receipt_title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">{t("sp_receipt_hint")}</div>
                <Button variant="outline" className="w-full" onClick={downloadReceipt} disabled={!lastPayment}>
                  <ReceiptText className="mr-2 size-4" />
                  {t("sp_download")}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/15 shadow-sm">
              <CardContent className="flex items-start gap-3 pt-6 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 text-primary" />
                {t("sp_secure_note")}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
