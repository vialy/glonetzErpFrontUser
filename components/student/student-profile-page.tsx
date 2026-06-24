"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, CircleAlert, Download, FileClock, KeyRound, LogOut, Wallet } from "lucide-react"
import Link from "next/link"
import { StudentChangePinDialog } from "@/components/student/student-change-pin-dialog"
import { StudentStatCard } from "@/components/student/student-stat-card"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { certificatesService, type TrainingCertificate } from "@/domains/certificates"
import { paymentsService, type StudentTuitionSummary } from "@/domains/payments"
import { useAuth } from "@/hooks/use-auth"
import { useStudentProfile } from "@/hooks/use-student-profile"
import { useLocale } from "@/hooks/use-locale"
import { downloadStudentCertificatePdf } from "@/lib/student-certificate-pdf"
import { CACHE_KEYS, getCached, hasCached, setCached } from "@/lib/client-cache"

const DEFAULT_SUMMARY: StudentTuitionSummary = {
  studentName: "Etudiant Demo",
  className: "A1",
  totalTuition: 0,
  amountPaid: 0,
  remainingAmount: 0,
}

function formatDisplayPhone(phone: string | null | undefined): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length >= 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }
  return phone
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export function StudentProfilePage() {
  const { t, locale } = useLocale()
  const { phone, logout, mustChangePin } = useAuth()
  const { profile, studentClass } = useStudentProfile()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [mustChangeBanner, setMustChangeBanner] = useState(mustChangePin)

  const formatFcfa = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} F CFA`
  const formatDateShort = (value: string) =>
    new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")

  const [summary, setSummary] = useState<StudentTuitionSummary>(
    () => getCached<StudentTuitionSummary>(CACHE_KEYS.paymentsSummary) ?? DEFAULT_SUMMARY,
  )
  const [certificates, setCertificates] = useState<TrainingCertificate[]>(
    () => getCached<TrainingCertificate[]>(CACHE_KEYS.certificatesForStudent) ?? [],
  )
  const [financeLoading, setFinanceLoading] = useState(() => !hasCached(CACHE_KEYS.paymentsSummary))

  // Données identité/classe issues de /users/me + /users/my-class ;
  // les montants financiers restent fournis par le résumé des paiements.
  const studentName = profile?.name || summary.studentName
  const className = studentClass?.title || summary.className
  const displayPhone = profile?.phone || phone

  useEffect(() => {
    const refresh = async () => {
      try {
        const next = await paymentsService.getSummary()
        setSummary(next)
        setCached(CACHE_KEYS.paymentsSummary, next)
      } catch {
        // Endpoint paiements pas encore connecte : valeurs par defaut conservees.
      }
      try {
        const next = await certificatesService.getForStudent()
        setCertificates(next)
        setCached(CACHE_KEYS.certificatesForStudent, next)
      } catch {
        // Endpoint certificats pas encore connecte : liste vide conservee.
      } finally {
        setFinanceLoading(false)
      }
    }
    void refresh()
    window.addEventListener("student-payments-updated", refresh)
    return () => window.removeEventListener("student-payments-updated", refresh)
  }, [])

  useEffect(() => {
    setMustChangeBanner(mustChangePin)
  }, [mustChangePin])

  const paymentProgress = useMemo(() => {
    if (summary.totalTuition <= 0) return 0
    return Math.min(100, Math.round((summary.amountPaid / summary.totalTuition) * 100))
  }, [summary.amountPaid, summary.totalTuition])

  const pdfLabels = useMemo(
    () => ({
      title: t("prof_pdf_attest_title"),
      certifies: t("prof_pdf_certifies"),
      validated: t("prof_pdf_validated"),
      program: t("prof_pdf_program"),
      issue: t("prof_pdf_issue"),
      ref: t("prof_pdf_ref"),
      sign: t("prof_pdf_sign"),
    }),
    [t],
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <MobileBackButton />

      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-primary to-cyan-500 text-primary-foreground shadow-lg">
        <div className="p-5 md:p-6">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{t("prof_title")}</h1>
          <p className="mt-1 text-sm text-primary-foreground/90">{studentName}</p>
        </div>
        <div className="space-y-3 bg-black/10 px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-primary-foreground/90">{className}</span>
            <span className="font-semibold tabular-nums">{paymentProgress}%</span>
          </div>
          <Progress value={paymentProgress} className="h-2 bg-primary-foreground/20 [&>div]:bg-primary-foreground" />
        </div>
      </div>

      {mustChangeBanner ? (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="size-4 text-amber-600" />
          <AlertTitle className="text-sm">{t("first_login_title")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">{t("prof_must_change_pin")}</span>
            <Button size="sm" onClick={() => setPinDialogOpen(true)}>
              {t("prof_pin_btn")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StudentStatCard
          icon={<Wallet className="size-4" />}
          tone="indigo"
          label={t("prof_fin_total")}
          value={formatFcfa(summary.totalTuition)}
          hint={className}
          loading={financeLoading}
        />
        <StudentStatCard
          icon={<CheckCircle2 className="size-4" />}
          tone="emerald"
          label={t("prof_fin_paid")}
          value={formatFcfa(summary.amountPaid)}
          trend={summary.totalTuition > 0 ? { value: `${paymentProgress}%`, positive: true } : undefined}
          loading={financeLoading}
        />
        <StudentStatCard
          icon={<CircleAlert className="size-4" />}
          tone="rose"
          label={t("prof_fin_remain")}
          value={formatFcfa(summary.remainingAmount)}
          loading={financeLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-primary/15 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("prof_card_info")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow label={t("prof_label_name")} value={studentName} />
            <Separator />
            <InfoRow label={t("prof_label_class")} value={className} />
            <Separator />
            <InfoRow label={t("prof_phone_main")} value={formatDisplayPhone(displayPhone)} />
            <Separator />
            <div className="flex flex-col gap-2 pt-4 sm:flex-row">
              <Button className="flex-1" variant="outline" onClick={() => setPinDialogOpen(true)}>
                <KeyRound className="mr-2 size-4" />
                {t("prof_pin_btn")}
              </Button>
              <Button className="flex-1" variant="ghost" onClick={() => logout()}>
                <LogOut className="mr-2 size-4" />
                {t("prof_logout_btn")}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("prof_readonly")}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/15 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("prof_certs_section")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {certificates.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                  <FileClock className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("prof_certs_empty")}</p>
                </div>
              ) : null}
              {certificates.map((certificate) => {
                const available = certificate.status === "disponible"
                return (
                  <div
                    key={certificate.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {t("prof_level_lbl")} {certificate.level}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {available
                          ? certificate.issuedAt
                            ? formatDateShort(certificate.issuedAt)
                            : t("prof_avail_badge")
                          : t("prof_pending_badge")}
                      </p>
                    </div>
                    {available ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void downloadStudentCertificatePdf({
                            certificate,
                            studentName,
                            labels: pdfLabels,
                            formatDateShort,
                            locale,
                          })
                        }
                      >
                        <Download className="mr-1 size-3.5" />
                        {t("prof_cert_dl")}
                      </Button>
                    ) : (
                      <Badge variant="secondary">{t("prof_pending_badge")}</Badge>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
      </div>

      <div className="flex justify-center sm:justify-start">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/dashboard/mes-paiements">{t("prof_link_payments")}</Link>
        </Button>
      </div>

      <StudentChangePinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        onSuccess={() => setMustChangeBanner(false)}
      />
    </div>
  )
}
