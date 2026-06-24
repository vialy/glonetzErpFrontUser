"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Paperclip, Send, ShieldAlert } from "lucide-react"
import { ClaimProofActions } from "@/components/claims/claim-proof-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { claimsService, type ClaimPaymentMethod, type ClaimRecord } from "@/domains/claims"
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
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<ClaimPaymentMethod>("orange_money")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [transactionReference, setTransactionReference] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [description, setDescription] = useState("")
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [claims, setClaims] = useState<ClaimRecord[]>(
    () => getCached<ClaimRecord[]>(CACHE_KEYS.claimsAll) ?? [],
  )
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(() => !hasCached(CACHE_KEYS.claimsAll))

  useEffect(() => {
    const refresh = async () => {
      try {
        const next = await claimsService.getAll()
        setClaims(next)
        setCached(CACHE_KEYS.claimsAll, next)
      } catch {
        // Reclamations indisponibles : liste vide conservee.
      } finally {
        setLoading(false)
      }
    }
    void refresh()
    window.addEventListener("claims-updated", refresh)
    return () => window.removeEventListener("claims-updated", refresh)
  }, [])

  const submitClaim = async () => {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    try {
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error("INVALID_AMOUNT")
      if (!screenshotFile) throw new Error("PROOF_REQUIRED")
      if (!paymentDate) throw new Error("DATE_REQUIRED")
      await claimsService.create({
        amount: Number(amount),
        paymentMethod,
        phoneNumber,
        transactionReference,
        description,
        paymentDate: new Date(paymentDate).toISOString(),
        screenshotFile,
      })
      setClaims(await claimsService.getAll())
      setAmount("")
      setPhoneNumber("")
      setTransactionReference("")
      setPaymentDate("")
      setDescription("")
      setScreenshotFile(null)
      setMessage({ type: "success", text: t("recl_msg_ok") })
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN"
      if (code === "INVALID_AMOUNT") setMessage({ type: "error", text: t("recl_err_amount") })
      else if (code === "PROOF_REQUIRED") setMessage({ type: "error", text: t("recl_err_proof") })
      else if (code === "DATE_REQUIRED") setMessage({ type: "error", text: t("recl_err_date") })
      else if (code === "PHONE_REQUIRED") setMessage({ type: "error", text: t("recl_err_phone") })
      else if (code === "REFERENCE_REQUIRED") setMessage({ type: "error", text: t("recl_err_ref") })
      else if (code === "DESCRIPTION_REQUIRED") setMessage({ type: "error", text: t("recl_err_desc") })
      else setMessage({ type: "error", text: t("recl_err_generic") })
    } finally {
      setSubmitting(false)
    }
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
                <Label htmlFor="claim-amount">{t("recl_label_amount")}</Label>
                <Input
                  id="claim-amount"
                  type="number"
                  placeholder={t("recl_ph_amount")}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("recl_label_method")}</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as ClaimPaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("recl_ph_method")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orange_money">{t("sp_method_om")}</SelectItem>
                    <SelectItem value="mtn_momo">{t("sp_method_mtn")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="debited-phone">{t("recl_label_phone")}</Label>
                <Input
                  id="debited-phone"
                  type="tel"
                  placeholder={t("recl_ph_phone")}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction-ref">{t("recl_label_ref")}</Label>
                <Input
                  id="transaction-ref"
                  placeholder={t("recl_ph_ref")}
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
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
                  <span className="font-semibold">{formatFcfa(claim.amount)}</span> -{" "}
                  {claim.paymentMethod === "orange_money" ? t("sp_method_om") : t("sp_method_mtn")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("prof_pdf_ref")} {claim.transactionReference}
                </p>
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

