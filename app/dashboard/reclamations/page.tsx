"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Paperclip, Send, ShieldAlert } from "lucide-react"
import { ClaimProofActions } from "@/components/claims/claim-proof-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MobileBackButton } from "@/components/mobile-back-button"
import { DataLoadError } from "@/components/student/data-load-error"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { claimsService, type ClaimRecord } from "@/domains/claims"
import { paymentsService, type StudentPaymentRecord } from "@/domains/payments"
import { CACHE_KEYS, getCached, hasCached, setCached } from "@/lib/client-cache"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

function statusBadge(status: ClaimRecord["status"], t: (k: TranslationKey) => string) {
  if (status === "en_attente") return <Badge variant="secondary">{t("recl_st_pending")}</Badge>
  if (status === "en_cours")
    return (
      <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">{t("recl_st_progress")}</Badge>
    )
  if (status === "resolue")
    return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/20">{t("recl_st_resolved")}</Badge>
  return (
    <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">{t("recl_st_rejected")}</Badge>
  )
}

export default function ReclamationsPage() {
  const { t, locale } = useLocale()
  const formatFcfa = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} F CFA`
  const formatDate = (value: string) =>
    new Date(value).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  const [selectedPaymentId, setSelectedPaymentId] = useState("")
  const [claimablePayments, setClaimablePayments] = useState<StudentPaymentRecord[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentDate, setPaymentDate] = useState("")
  const [description, setDescription] = useState("")
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)

  const selectedPayment = claimablePayments.find((p) => p.paymentId === selectedPaymentId) ?? null
  const [claims, setClaims] = useState<ClaimRecord[]>(
    () => getCached<ClaimRecord[]>(CACHE_KEYS.claimsAll) ?? [],
  )

  // Un paiement ne peut avoir qu'une seule reclamation : on retire de la liste
  // ceux qui en ont deja une pour eviter l'erreur de doublon cote back-end.
  const claimedPaymentIds = new Set(claims.map((c) => c.paymentId).filter(Boolean))
  const availablePayments = claimablePayments.filter((p) => !claimedPaymentIds.has(p.paymentId))
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(() => !hasCached(CACHE_KEYS.claimsAll))
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    let ok = false
    try {
      const next = await claimsService.getAll()
      setClaims(next)
      setCached(CACHE_KEYS.claimsAll, next)
      ok = true
    } catch {
      // Reclamations indisponibles : liste vide conservee.
    }
    setLoading(false)
    setError(!ok && !hasCached(CACHE_KEYS.claimsAll))
  }, [])

  useEffect(() => {
    void load()
    window.addEventListener("claims-updated", load)
    return () => window.removeEventListener("claims-updated", load)
  }, [load])

  const loadClaimablePayments = useCallback(async () => {
    setPaymentsLoading(true)
    try {
      setClaimablePayments(await paymentsService.getClaimablePayments())
    } catch {
      setClaimablePayments([])
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadClaimablePayments()
  }, [loadClaimablePayments])

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId)
    // Pré-remplit la date du paiement à partir du paiement sélectionné (modifiable).
    const payment = claimablePayments.find((p) => p.paymentId === paymentId)
    if (payment) setPaymentDate((payment.paidAt ?? payment.createdAt).slice(0, 10))
  }

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    await load()
    setRetrying(false)
  }, [load])

  const submitClaim = async () => {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    try {
      if (!selectedPaymentId) throw new Error("PAYMENT_REQUIRED")
      if (!screenshotFile) throw new Error("PROOF_REQUIRED")
      if (!paymentDate) throw new Error("DATE_REQUIRED")
      await claimsService.create({
        paymentId: selectedPaymentId,
        paymentDate: new Date(paymentDate).toISOString(),
        description,
        screenshotFile,
      })
      setClaims(await claimsService.getAll())
      await loadClaimablePayments()
      setSelectedPaymentId("")
      setPaymentDate("")
      setDescription("")
      setScreenshotFile(null)
      setMessage({ type: "success", text: t("recl_msg_ok") })
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN"
      if (code === "PAYMENT_REQUIRED") setMessage({ type: "error", text: t("recl_err_payment") })
      else if (code === "PROOF_REQUIRED") setMessage({ type: "error", text: t("recl_err_proof") })
      else if (code === "DATE_REQUIRED") setMessage({ type: "error", text: t("recl_err_date") })
      else if (code === "DESCRIPTION_REQUIRED") setMessage({ type: "error", text: t("recl_err_desc") })
      else if (code === "CLAIM_ALREADY_EXISTS") setMessage({ type: "error", text: t("recl_err_duplicate") })
      else if (code === "PAYMENT_NOT_FOUND") setMessage({ type: "error", text: t("recl_err_payment_not_found") })
      else setMessage({ type: "error", text: t("recl_err_generic") })
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return <DataLoadError fullScreen onRetry={handleRetry} retrying={retrying} />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <MobileBackButton />
      <div
        className={`fixed top-16 left-1/2 z-[110] w-[92%] max-w-xl -translate-x-1/2 rounded-xl border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur transition-all duration-300 ${
          submitting || message ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        } ${
          submitting
            ? "border-primary/30"
            : message?.type === "success"
              ? "border-green-500/25"
              : message?.type === "error"
                ? "border-destructive/30"
                : "border-border"
        }`}
      >
        {submitting ? (
          <div>
            <p className="text-sm font-medium text-foreground">{t("recl_submitting")}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        ) : message ? (
          <p className={`text-sm font-medium ${message.type === "success" ? "text-green-700" : "text-destructive"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
        <div className="p-5 md:p-6">
          <h1 className="text-xl font-bold md:text-2xl">{t("recl_title")}</h1>
          <p className="mt-1 text-sm text-primary-foreground/85">{t("recl_subtitle")}</p>
        </div>
        <div className="bg-black/10 px-5 py-3 md:px-6 text-xs text-primary-foreground/90">{t("recl_banner")}</div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-primary/15 shadow-sm overflow-hidden">
          {submitting ? (
            <div className="h-1 w-full overflow-hidden bg-primary/10">
              <div className="h-full w-1/2 animate-pulse bg-primary" />
            </div>
          ) : null}
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-primary" />
              {t("recl_new_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("recl_label_payment")}</Label>
                <Select
                  value={selectedPaymentId}
                  onValueChange={handleSelectPayment}
                  disabled={paymentsLoading || availablePayments.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("recl_ph_payment")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePayments.map((p) => (
                      <SelectItem key={p.paymentId} value={p.paymentId}>
                        {p.paymentId} · {formatFcfa(p.amount)} ·{" "}
                        {p.status === "failed" ? t("recl_payment_status_failed") : t("recl_payment_status_pending")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!paymentsLoading && availablePayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("recl_no_claimable")}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-amount">{t("recl_label_amount")}</Label>
                <Input
                  id="claim-amount"
                  type="text"
                  readOnly
                  placeholder="—"
                  value={selectedPayment ? formatFcfa(selectedPayment.amount) : ""}
                />
              </div>
            </div>

            <div className="space-y-2 md:max-w-xs">
              <Label htmlFor="claim-date">{t("recl_label_date")}</Label>
              <Input
                id="claim-date"
                type="date"
                value={paymentDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-description">{t("recl_label_desc")}</Label>
              <Textarea
                id="claim-description"
                placeholder={t("recl_ph_desc")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-file">{t("recl_label_file")}</Label>
              <Input
                id="claim-file"
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
              />
              {screenshotFile ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="size-3" /> {screenshotFile.name}
                </p>
              ) : null}
            </div>

            {message ? (
              <div
                className={
                  message.type === "success"
                    ? "rounded-xl border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
                    : "rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                }
              >
                {message.text}
              </div>
            ) : null}

            <Button className="sm:min-w-44" onClick={submitClaim} disabled={submitting}>
              <Send className="mr-2 size-4" />
              {submitting ? t("recl_send_btn") : t("recl_submit")}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/15 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="size-4 text-primary" />
              {t("recl_tips_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("recl_tip_1")}</p>
            <p>{t("recl_tip_2")}</p>
            <p>{t("recl_tip_3")}</p>
            <p>{t("recl_tip_4")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("recl_follow_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : claims.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              {t("recl_empty_list")}
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="rounded-xl border p-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{claim.id}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(claim.createdAt)}</p>
                  </div>
                  {statusBadge(claim.status, t)}
                </div>
                <p className="mt-2 text-sm">
                  {t("recl_amount_lbl")}{" "}
                  <span className="font-semibold">{formatFcfa(claim.amount)}</span>
                </p>
                {claim.paymentId ? (
                  <p className="text-sm text-muted-foreground">
                    {t("recl_label_payment")}: {claim.paymentId}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">{claim.description}</p>
                {claim.screenshotDataUrl ? (
                  <ClaimProofActions
                    className="mt-2"
                    claimId={claim.id}
                    screenshotDataUrl={claim.screenshotDataUrl}
                    screenshotName={claim.screenshotName}
                    viewLabel={t("recl_view_cap")}
                    downloadLabel={t("recl_download_cap")}
                    previewTitle={t("recl_proof_preview_title")}
                  />
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

