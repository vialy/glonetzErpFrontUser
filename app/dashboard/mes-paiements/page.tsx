"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, Download, Info, ReceiptText, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StudentStatCard } from "@/components/student/student-stat-card"
import { ScholarshipBanner } from "@/components/student/scholarship-banner"
import { DataLoadError } from "@/components/student/data-load-error"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MobileBackButton } from "@/components/mobile-back-button"
import { claimsService, type ClaimRecord } from "@/domains/claims"
import { paymentsService, type StudentPaymentRecord, type StudentTuitionSummary } from "@/domains/payments"
import { formatFcfaForPdf, sanitizeTextForPdf } from "@/lib/pdf-text"
import { CACHE_KEYS, getCached, hasCached, setCached } from "@/lib/client-cache"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

type PaymentStatus = "paye" | "en_cours" | "rejetee"
type StatusFilter = "all" | PaymentStatus | "manuel"

const PAGE_SIZE = 10

const DEFAULT_SUMMARY: StudentTuitionSummary = {
  studentName: "Etudiant Demo",
  className: "A1",
  totalTuition: 0,
  amountPaid: 0,
  remainingAmount: 0,
}

interface PaymentLine {
  id: string
  date: string
  amount: number
  method: StudentPaymentRecord["paymentMethod"]
  status: PaymentStatus
  sourceType: "payment" | "claim"
  note?: string
  transactionReference?: string
  phoneNumber?: string
  description?: string
}

function StatusBadge({ status, t }: { status: PaymentStatus; t: (k: TranslationKey) => string }) {
  if (status === "paye") {
    return (
      <Badge className="inline-flex items-center gap-1 bg-green-500/15 text-green-700 hover:bg-green-500/20 dark:text-green-400">
        <CheckCircle2 className="size-3" />
        {t("mp_status_paid")}
      </Badge>
    )
  }
  if (status === "en_cours") {
    return (
      <Badge className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">
        <Clock3 className="size-3" />
        {t("mp_status_progress")}
      </Badge>
    )
  }
  return (
    <Badge className="inline-flex items-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20">
      <CircleAlert className="size-3" />
      {t("mp_status_rejected")}
    </Badge>
  )
}

function mapPaymentStatus(status: StudentPaymentRecord["status"]): PaymentStatus {
  if (status === "pending") return "en_cours"
  if (status === "failed" || status === "cancelled" || status === "refunded") return "rejetee"
  // "successful" ou absent (mock) -> paye
  return "paye"
}

function buildPaymentLines(payments: StudentPaymentRecord[], claims: ClaimRecord[]): PaymentLine[] {
  const linesFromPayments: PaymentLine[] = payments.map((payment) => ({
    id: payment.paymentId,
    date: payment.paidAt ?? payment.createdAt,
    amount: payment.amount,
    method: payment.paymentMethod,
    status: mapPaymentStatus(payment.status),
    sourceType: "payment",
    note: payment.note,
  }))

  const appliedClaimIds = new Set(payments.map((payment) => payment.sourceClaimId).filter(Boolean))

  const linesFromClaims: PaymentLine[] = claims
    .filter((claim) => !appliedClaimIds.has(claim.id))
    .map((claim) => ({
      id: claim.id,
      date: claim.createdAt,
      amount: claim.amount,
      method: claim.paymentMethod ?? "mtn_momo",
      status: claim.status === "rejetee" ? "rejetee" : claim.status === "resolue" ? "paye" : "en_cours",
      sourceType: "claim",
      transactionReference: claim.transactionReference,
      phoneNumber: claim.phoneNumber,
      description: claim.description,
    }))

  return [...linesFromPayments, ...linesFromClaims].sort((a, b) => (a.date > b.date ? -1 : 1))
}

export default function MesPaiementsPage() {
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
  const methodLabel = (method: StudentPaymentRecord["paymentMethod"]) => {
    if (method === "orange_money") return t("sp_method_om")
    if (method === "mtn_momo") return t("sp_method_mtn")
    return t("sp_method_cash")
  }

  const [summary, setSummary] = useState<StudentTuitionSummary>(
    () => getCached<StudentTuitionSummary>(CACHE_KEYS.paymentsSummary) ?? DEFAULT_SUMMARY,
  )
  const [payments, setPayments] = useState<StudentPaymentRecord[]>(
    () => getCached<StudentPaymentRecord[]>(CACHE_KEYS.paymentsList) ?? [],
  )
  const [claims, setClaims] = useState<ClaimRecord[]>(
    () => getCached<ClaimRecord[]>(CACHE_KEYS.claimsAll) ?? [],
  )
  const [selectedPayment, setSelectedPayment] = useState<PaymentLine | null>(null)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(
    () => !hasCached(CACHE_KEYS.paymentsSummary) && !hasCached(CACHE_KEYS.paymentsList),
  )
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    // Donnée principale de la page : l'historique des paiements (avec la synthèse).
    let mainOk = false
    try {
      const next = await paymentsService.getSummary()
      setSummary(next)
      setCached(CACHE_KEYS.paymentsSummary, next)
    } catch {
      // Resume de scolarite indisponible : valeurs par defaut conservees.
    }
    try {
      const next = await paymentsService.getPayments()
      setPayments(next)
      setCached(CACHE_KEYS.paymentsList, next)
      mainOk = true
    } catch {
      // Historique paiements indisponible.
    }
    try {
      const next = await claimsService.getAll()
      setClaims(next)
      setCached(CACHE_KEYS.claimsAll, next)
    } catch {
      // Reclamations pas encore connectees au backend.
    }
    setLoading(false)
    setError(!mainOk && !hasCached(CACHE_KEYS.paymentsList))
  }, [])

  useEffect(() => {
    void load()
    window.addEventListener("student-payments-updated", load)
    window.addEventListener("claims-updated", load)
    return () => {
      window.removeEventListener("student-payments-updated", load)
      window.removeEventListener("claims-updated", load)
    }
  }, [load])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    await load()
    setRetrying(false)
  }, [load])

  const paymentLines = useMemo(() => buildPaymentLines(payments, claims), [payments, claims])
  const inProgressCount = useMemo(() => paymentLines.filter((p) => p.status === "en_cours").length, [paymentLines])
  const rejectedCount = useMemo(() => paymentLines.filter((p) => p.status === "rejetee").length, [paymentLines])

  const filteredLines = useMemo(() => {
    if (statusFilter === "all") return paymentLines
    if (statusFilter === "manuel") {
      // Versements manuels (guichet) : paiements directs en especes.
      return paymentLines.filter((p) => p.sourceType === "payment" && p.method === "cash")
    }
    return paymentLines.filter((p) => p.status === statusFilter)
  }, [paymentLines, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLines.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedLines = useMemo(
    () => filteredLines.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredLines, currentPage],
  )

  useEffect(() => {
    setPage(1)
  }, [statusFilter, paymentLines.length])
  const paymentProgress = useMemo(
    () => (summary.totalTuition > 0 ? Math.min(100, Math.round((summary.amountPaid / summary.totalTuition) * 100)) : 0),
    [summary.amountPaid, summary.totalTuition],
  )

  const downloadPaymentReceipt = async () => {
    if (!selectedPayment || selectedPayment.status !== "paye" || downloadingReceipt) return
    setDownloadingReceipt(true)
    try {
      const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
      const logoDataUrl = await fetch("/images/logo.png")
        .then((res) => res.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(String(reader.result))
              reader.onerror = () => reject(new Error("LOGO_READ_FAILED"))
              reader.readAsDataURL(blob)
            })
        )
        .catch(() => "")

      const sourceLabel =
        selectedPayment.sourceType === "payment" ? t("mp_source_direct") : t("mp_source_claim")
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const left = 16
      const right = pageWidth - 16

      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 42, "F")
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", left, 9, 28, 10)
      }
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.text(t("mp_pdf_title"), left, 28)
      doc.setFontSize(11)
      doc.text(`${t("sp_pdf_ref")} ${selectedPayment.id}`, left, 35)

      doc.setTextColor(15, 23, 42)
      doc.setFontSize(11)
      let y = 56
      const row = (label: string, value: string) => {
        const safe = sanitizeTextForPdf(value)
        doc.setTextColor(71, 85, 105)
        doc.text(label, left, y)
        doc.setTextColor(15, 23, 42)
        doc.text(safe, right, y, { align: "right" })
        doc.setDrawColor(226, 232, 240)
        doc.line(left, y + 2, right, y + 2)
        y += 10
      }

      row(t("sp_pdf_student"), summary.studentName)
      row(t("sp_pdf_class"), summary.className)
      row(t("sp_pdf_date"), formatDate(selectedPayment.date))
      row(t("sp_pdf_method"), methodLabel(selectedPayment.method))
      row(t("sp_pdf_amount_paid"), formatFcfaForPdf(selectedPayment.amount))
      row(t("mp_pdf_source"), sourceLabel)
      row(t("sp_pdf_total_paid"), formatFcfaForPdf(summary.amountPaid))
      row(t("sp_pdf_remain"), formatFcfaForPdf(summary.remainingAmount))

      if (selectedPayment.transactionReference) row(t("mp_row_ref_pay"), selectedPayment.transactionReference)
      if (selectedPayment.phoneNumber) row(t("mp_row_phone"), selectedPayment.phoneNumber)

      if (selectedPayment.note || selectedPayment.description) {
        const text = sanitizeTextForPdf(selectedPayment.note ?? selectedPayment.description ?? "")
        doc.setFillColor(248, 250, 252)
        doc.roundedRect(left, y + 6, right - left, 24, 2, 2, "F")
        doc.setTextColor(71, 85, 105)
        doc.setFontSize(10)
        doc.text(t("mp_pdf_note"), left + 4, y + 14)
        doc.setTextColor(15, 23, 42)
        doc.text(text.slice(0, 90), left + 18, y + 14)
      }

      doc.save(`recu-${selectedPayment.id}.pdf`)
    } finally {
      setDownloadingReceipt(false)
    }
  }

  if (error) {
    return <DataLoadError fullScreen onRetry={handleRetry} retrying={retrying} />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <MobileBackButton />
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-primary to-cyan-500 text-primary-foreground shadow-lg">
        <div className="p-5 md:p-6">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{t("mp_title")}</h1>
          <p className="mt-1 text-sm text-primary-foreground/90">{t("mp_hero_sub")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 bg-black/10 px-5 py-3 text-sm md:grid-cols-2 md:px-6">
          <p className="text-primary-foreground/90">
            {t("mp_class_line")} <span className="font-semibold">{summary.className}</span>
          </p>
          <p className="text-primary-foreground/90 md:text-right">
            {t("mp_remain_line")} <span className="font-semibold">{formatFcfa(summary.remainingAmount)}</span>
          </p>
        </div>
      </div>

      {summary.isScholarshipHolder ? <ScholarshipBanner summary={summary} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StudentStatCard
          icon={<Wallet className="size-4" />}
          tone="indigo"
          label={t("mp_card_fee_total")}
          value={formatFcfa(summary.totalTuition)}
          hint={summary.className}
          loading={loading}
        />
        <StudentStatCard
          icon={<CheckCircle2 className="size-4" />}
          tone="emerald"
          label={t("mp_card_paid_total")}
          value={formatFcfa(summary.amountPaid)}
          trend={summary.totalTuition > 0 ? { value: `${paymentProgress}%`, positive: true } : undefined}
          loading={loading}
        />
        <StudentStatCard
          icon={<CircleAlert className="size-4" />}
          tone="rose"
          label={t("mp_card_remain")}
          value={formatFcfa(summary.remainingAmount)}
          loading={loading}
        />
      </div>

      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-base">{t("mp_hist_title")}</CardTitle>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-[160px]" aria-label={t("mp_filter_status")}>
              <SelectValue placeholder={t("mp_filter_status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("mp_filter_all")}</SelectItem>
              <SelectItem value="paye">{t("mp_status_paid")}</SelectItem>
              <SelectItem value="en_cours">{t("mp_status_progress")}</SelectItem>
              <SelectItem value="rejetee">{t("mp_status_rejected")}</SelectItem>
              <SelectItem value="manuel">{t("mp_filter_manual")}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : null}

          {!loading && paymentLines.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("mp_empty_hint")}
            </div>
          ) : !loading && filteredLines.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("mp_filter_none")}
            </div>
          ) : null}

          {!loading && filteredLines.length > 0 ? (
          <div className="hidden overflow-hidden rounded-2xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("mp_th_ref")}</TableHead>
                  <TableHead>{t("mp_col_date")}</TableHead>
                  <TableHead>{t("mp_col_amount")}</TableHead>
                  <TableHead>{t("mp_col_method")}</TableHead>
                  <TableHead>{t("mp_col_status")}</TableHead>
                  <TableHead>{t("mp_th_source")}</TableHead>
                  <TableHead className="text-right">{t("mp_th_action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLines.map((payment, index) => (
                  <TableRow key={`${payment.id}-${payment.date}-${payment.status}-${index}`}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{formatFcfa(payment.amount)}</TableCell>
                    <TableCell>{methodLabel(payment.method)}</TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} t={t} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.sourceType === "payment" ? t("mp_src_direct_short") : t("mp_src_claim_short")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPayment(payment)}>
                        {t("mp_view_detail")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          ) : null}

          {!loading && filteredLines.length > 0 ? (
          <div className="space-y-3 md:hidden">
            {pagedLines.map((payment, index) => (
              <div
                key={`${payment.id}-${payment.date}-${payment.status}-${index}`}
                className="rounded-2xl border bg-gradient-to-b from-background to-muted/20 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{payment.id}</p>
                  <StatusBadge status={payment.status} t={t} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(payment.date)} - {methodLabel(payment.method)}
                </p>
                <p className="mt-1 text-sm font-semibold">{formatFcfa(payment.amount)}</p>
                <div className="mt-2">
                  <Badge variant="outline">
                    {payment.sourceType === "payment" ? t("mp_src_direct_short") : t("mp_src_claim_short")}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setSelectedPayment(payment)}>
                  {t("mp_view_detail")}
                </Button>
              </div>
            ))}
          </div>
          ) : null}

          {!loading && filteredLines.length > PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                {t("mp_pager_prev")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("mp_pager_page")} {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("mp_pager_next")}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StudentStatCard
          icon={<Clock3 className="size-4" />}
          tone="amber"
          label={t("mp_stat_in_progress")}
          value={String(inProgressCount)}
          showInfo={false}
          loading={loading}
        />
        <StudentStatCard
          icon={<CircleAlert className="size-4" />}
          tone="rose"
          label={t("mp_stat_rejected")}
          value={String(rejectedCount)}
          showInfo={false}
          loading={loading}
        />
        <StudentStatCard
          icon={<ReceiptText className="size-4" />}
          tone="slate"
          label={t("mp_stat_total")}
          value={String(paymentLines.length)}
          showInfo={false}
          loading={loading}
        />
      </div>

      <Dialog open={Boolean(selectedPayment)} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="size-4" />
              {t("mp_dialog_title")}
            </DialogTitle>
            <DialogDescription>{t("mp_dialog_desc")}</DialogDescription>
          </DialogHeader>

          {selectedPayment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">{t("mp_th_ref")}</p>
                  <p className="mt-1 font-mono text-sm">{selectedPayment.id}</p>
                </div>
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">{t("mp_col_date")}</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(selectedPayment.date)}</p>
                </div>
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">{t("mp_col_amount")}</p>
                  <p className="mt-1 text-sm font-semibold">{formatFcfa(selectedPayment.amount)}</p>
                </div>
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">{t("mp_col_method")}</p>
                  <p className="mt-1 text-sm font-medium">{methodLabel(selectedPayment.method)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedPayment.status} t={t} />
                <Badge variant="outline">
                  {selectedPayment.sourceType === "payment" ? t("mp_source_direct") : t("mp_source_claim")}
                </Badge>
              </div>

              {selectedPayment.transactionReference || selectedPayment.phoneNumber || selectedPayment.description || selectedPayment.note ? (
                <div className="space-y-2 rounded-xl border p-3">
                  <p className="text-xs font-medium text-muted-foreground">{t("mp_extra_info")}</p>
                  {selectedPayment.transactionReference ? (
                    <p className="text-sm">
                      <span className="font-medium">{t("mp_lbl_ref_tx")}</span> {selectedPayment.transactionReference}
                    </p>
                  ) : null}
                  {selectedPayment.phoneNumber ? (
                    <p className="text-sm">
                      <span className="font-medium">{t("mp_lbl_pay_phone")}</span> {selectedPayment.phoneNumber}
                    </p>
                  ) : null}
                  {selectedPayment.note ? (
                    <p className="text-sm">
                      <span className="font-medium">{t("mp_lbl_note")}</span> {selectedPayment.note}
                    </p>
                  ) : null}
                  {selectedPayment.description ? (
                    <p className="text-sm">
                      <span className="font-medium">{t("mp_lbl_desc")}</span> {selectedPayment.description}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Info className="size-3.5" />
                  {t("mp_dialog_hint")}
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {selectedPayment?.status === "paye" ? (
              <Button onClick={downloadPaymentReceipt} disabled={downloadingReceipt} className="gap-1.5">
                <Download className="size-3.5" />
                {downloadingReceipt ? t("mp_dl_generating") : t("sp_download")}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>
              {t("mp_btn_close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
