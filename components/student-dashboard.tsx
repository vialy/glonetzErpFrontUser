"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileClock,
  Home,
  PieChart as PieChartIcon,
  Receipt,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import {
  paymentsService,
  type PaymentMethod,
  type StudentPaymentRecord,
  type StudentTuitionSummary,
} from "@/domains/payments"
import { claimsService, type ClaimRecord } from "@/domains/claims"
import { profileService } from "@/domains/profile"
import { schoolCertificatesService, type StudentSchoolCertificateMine } from "@/domains/school-certificates"
import type { StudentClass } from "@/types"
import { useLocale } from "@/hooks/use-locale"
import { downloadStudentSchoolCertificatePdf } from "@/lib/student-school-certificate-pdf"
import {
  apiCertificateToStudentSchoolCertificate,
  buildStudentSchoolCertificate,
} from "@/lib/student-school-certificate"
import { canStudentDownloadSchoolCertificate } from "@/lib/school-certificate-permissions"
import { SchoolCertificateTemplateService } from "@/services/school-certificate-template.service"
import { StudentKpiTile } from "@/components/student/student-kpi-tile"
import { ScholarshipBanner } from "@/components/student/scholarship-banner"
import { DataLoadError } from "@/components/student/data-load-error"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { CACHE_KEYS, getCached, hasCached, setCached } from "@/lib/client-cache"

const DEFAULT_SUMMARY: StudentTuitionSummary = {
  studentName: "Etudiant Demo",
  className: "A1",
  totalTuition: 0,
  amountPaid: 0,
  remainingAmount: 0,
}

export function StudentDashboard() {
  const { t, locale } = useLocale()
  const [summary, setSummary] = useState<StudentTuitionSummary>(
    () => getCached<StudentTuitionSummary>(CACHE_KEYS.paymentsSummary) ?? DEFAULT_SUMMARY,
  )
  const [studentClass, setStudentClass] = useState<StudentClass | null>(
    () => getCached<StudentClass | null>(CACHE_KEYS.profileMyClass) ?? null,
  )
  const [payments, setPayments] = useState<StudentPaymentRecord[]>(
    () => getCached<StudentPaymentRecord[]>(CACHE_KEYS.paymentsList) ?? [],
  )
  const [claims, setClaims] = useState<ClaimRecord[]>(
    () => getCached<ClaimRecord[]>(CACHE_KEYS.claimsAll) ?? [],
  )
  const [schoolCertMine, setSchoolCertMine] = useState<StudentSchoolCertificateMine | null>(null)
  const [schoolCertLoading, setSchoolCertLoading] = useState(true)
  // Skeleton uniquement si rien n'est encore en cache.
  const [loading, setLoading] = useState(
    () => !hasCached(CACHE_KEYS.paymentsSummary) && !hasCached(CACHE_KEYS.paymentsList),
  )
  const [classLoading, setClassLoading] = useState(() => !hasCached(CACHE_KEYS.profileMyClass))
  // Erreur "plein écran" : uniquement quand la donnée principale échoue ET qu'on n'a rien en cache à afficher.
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState(false)

  // Echeance basee sur la date de debut de la classe (GET /users/my-class).
  const classStartLabel = studentClass?.startDate
    ? new Date(studentClass.startDate).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—"

  const load = useCallback(async () => {
    // La synthèse de paiement est la donnée principale du dashboard : si elle
    // échoue alors qu'aucune valeur n'est en cache, on bascule en mode erreur
    // plutôt que d'afficher une coquille remplie de zéros.
    let summaryOk = false
    try {
      const next = await paymentsService.getSummary()
      setSummary(next)
      setCached(CACHE_KEYS.paymentsSummary, next)
      summaryOk = true
    } catch {
      // On conserve la valeur précédente / par défaut.
    }
    try {
      const next = await paymentsService.getPayments()
      setPayments(next)
      setCached(CACHE_KEYS.paymentsList, next)
    } catch {
      if (!hasCached(CACHE_KEYS.paymentsList)) setPayments([])
    }
    try {
      const next = await claimsService.getAll()
      setClaims(next)
      setCached(CACHE_KEYS.claimsAll, next)
    } catch {
      if (!hasCached(CACHE_KEYS.claimsAll)) setClaims([])
    }
    try {
      // Classe de l'apprenant via /users/my-class (endpoint léger dédié).
      const next = await profileService.getMyClass()
      setStudentClass(next)
      setCached(CACHE_KEYS.profileMyClass, next)
    } catch {
      if (!hasCached(CACHE_KEYS.profileMyClass)) setStudentClass(null)
    }
    try {
      const [mine] = await Promise.all([
        schoolCertificatesService.getMine(),
        SchoolCertificateTemplateService.fetch(),
      ])
      setSchoolCertMine(mine)
    } catch {
      setSchoolCertMine(null)
    }
    setSchoolCertLoading(false)
    setLoading(false)
    setClassLoading(false)
    setError(!summaryOk && !hasCached(CACHE_KEYS.paymentsSummary))
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

  const paymentProgress = useMemo(() => {
    if (summary.totalTuition <= 0) return 0
    return Math.min(100, Math.round((summary.amountPaid / summary.totalTuition) * 100))
  }, [summary.amountPaid, summary.totalTuition])

  const fcfaNumber = (value: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)
  const formatFcfa = (value: number) => `${fcfaNumber(value)} F CFA`
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  const methodLabel = (method: PaymentMethod) =>
    method === "orange_money" ? t("sp_method_om") : method === "mtn_momo" ? t("sp_method_mtn") : t("sp_method_cash")

  // Series reelles pour les sparklines, derivees de l'historique des paiements.
  const { paidSeries, remainingSeries } = useMemo(() => {
    const settled = payments
      .filter((p) => p.status === undefined || p.status === "successful")
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const paid: number[] = [0]
    let running = 0
    for (const p of settled) {
      running += p.amount
      paid.push(running)
    }
    const total = summary.totalTuition || running
    const remaining = paid.map((cumulative) => Math.max(0, total - cumulative))
    return { paidSeries: paid, remainingSeries: remaining }
  }, [payments, summary.totalTuition])

  const settledPaymentCount = useMemo(
    () =>
      payments.filter((p) => p.status === undefined || p.status === "successful").length,
    [payments],
  )

  const nextDueNote = useMemo(() => {
    if (!studentClass?.startDate) return t("stu_kpi_next_no_date")
    if (summary.remainingAmount <= 0 && summary.totalTuition > 0) return t("stu_kpi_next_paid")
    if (summary.remainingAmount > 0) {
      return t("stu_kpi_next_remain").replace("{amount}", formatFcfa(summary.remainingAmount))
    }
    return t("stu_kpi_next_paid")
  }, [studentClass, summary, t, formatFcfa])

  const kpis = useMemo(
    () => [
      {
        categoryLabel: t("stu_header_pay"),
        categoryHref: "/dashboard/effectuer-paiement",
        label: t("stu_kpi_tuition"),
        value: fcfaNumber(summary.remainingAmount),
        unit: "F CFA",
        periodLabel:
          summary.totalTuition > 0
            ? `${100 - paymentProgress}% ${t("stu_kpi_tuition_note")}`
            : t("stu_kpi_tuition_note"),
        series: remainingSeries,
        tone: "rose" as const,
        loading,
      },
      {
        categoryLabel: t("stu_link_payments"),
        categoryHref: "/dashboard/mes-paiements",
        label: t("stu_kpi_paid"),
        value: fcfaNumber(summary.amountPaid),
        unit: "F CFA",
        periodLabel: t("stu_kpi_paid_note").replace("{count}", String(settledPaymentCount)),
        series: paidSeries,
        tone: "emerald" as const,
        loading,
      },
      {
        categoryLabel: t("stu_breadcrumb_dashboard"),
        categoryHref: "/dashboard/mon-profil",
        label: t("stu_kpi_next"),
        value: classStartLabel,
        unit: undefined,
        periodLabel: nextDueNote,
        series: [] as number[],
        tone: "sky" as const,
        loading: classLoading,
      },
    ],
    [t, summary, paymentProgress, classStartLabel, paidSeries, remainingSeries, loading, classLoading, settledPaymentCount, nextDueNote],
  )

  // Paiements recents reels : 4 derniers mouvements (tous statuts confondus).
  const recentPayments = useMemo(
    () =>
      payments
        .slice()
        .sort(
          (a, b) =>
            new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime(),
        )
        .slice(0, 4)
        .map((p) => ({
          id: p.paymentId,
          label: methodLabel(p.paymentMethod),
          date: formatDate(p.paidAt ?? p.createdAt),
          amount: formatFcfa(p.amount),
          status: p.status === "pending" ? t("stu_status_wait") : t("stu_status_ok"),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payments, t, locale],
  )

  const schoolCertificate = useMemo(() => {
    if (schoolCertMine?.certificate) {
      return apiCertificateToStudentSchoolCertificate(schoolCertMine.certificate)
    }
    return buildStudentSchoolCertificate({
      studentName: summary.studentName,
      studentClass,
    })
  }, [schoolCertMine, summary.studentName, studentClass])

  const tuitionFullyPaid = schoolCertMine?.tuitionFullyPaid ?? summary.remainingAmount <= 0

  const schoolCertDecision = useMemo(
    () =>
      canStudentDownloadSchoolCertificate(schoolCertificate, tuitionFullyPaid, {
        templateReady: schoolCertMine?.templateReady,
        canDownload: schoolCertMine?.canDownload,
      }),
    [schoolCertificate, tuitionFullyPaid, schoolCertMine],
  )

  const adminStatus = useMemo(() => {
    let value = t("stu_adm_todo")
    let tone = "bg-amber-500/10 text-amber-600"
    let icon = <FileClock className="size-3.5" />

    if (schoolCertDecision.allowed) {
      value = t("stu_adm_ready")
      tone = "bg-emerald-500/10 text-emerald-600"
      icon = <CheckCircle2 className="size-3.5" />
    } else if (!tuitionFullyPaid) {
      value = t("stu_adm_unpaid")
    } else if (schoolCertMine?.templateReady === false) {
      value = t("stu_adm_todo")
    } else {
      value = t("stu_adm_unavailable")
    }

    return {
      label: t("stu_adm_attest"),
      value,
      tone,
      icon,
      hint: schoolCertDecision.allowed ? schoolCertificate.className : schoolCertDecision.reason,
      canDownload: schoolCertDecision.allowed,
    }
  }, [t, schoolCertDecision, tuitionFullyPaid, schoolCertMine, schoolCertificate.className])

  async function downloadSchoolCertificate() {
    await SchoolCertificateTemplateService.fetch()
    await downloadStudentSchoolCertificatePdf(schoolCertificate)
  }

  // Repartition reelle par canal : part (%) du montant encaisse par methode.
  const paymentChannels = useMemo(() => {
    const settled = payments.filter((p) => p.status === undefined || p.status === "successful")
    const byMethod = new Map<PaymentMethod, number>()
    for (const p of settled) {
      byMethod.set(p.paymentMethod, (byMethod.get(p.paymentMethod) ?? 0) + p.amount)
    }
    const total = Array.from(byMethod.values()).reduce((sum, v) => sum + v, 0)
    const META: Record<PaymentMethod, { name: string; color: string }> = {
      orange_money: { name: t("sp_method_om"), color: "#FF6600" },
      mtn_momo: { name: t("sp_method_mtn"), color: "#FFCC00" },
      cash: { name: t("sp_method_cash"), color: "#6366f1" },
    }
    return Array.from(byMethod.entries()).map(([method, amount]) => ({
      name: META[method].name,
      value: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: META[method].color,
    }))
  }, [payments, t])

  const hasChannelData = paymentChannels.some((c) => c.value > 0)

  // Repartition reelle des reclamations par statut.
  const claimsStatus = useMemo(() => {
    let done = 0
    let prog = 0
    let rej = 0
    for (const c of claims) {
      if (c.status === "resolue") done += 1
      else if (c.status === "rejetee") rej += 1
      else prog += 1
    }
    return [
      { name: t("stu_cl_done"), value: done, color: "#16a34a" },
      { name: t("stu_cl_prog"), value: prog, color: "#f59e0b" },
      { name: t("stu_cl_rej"), value: rej, color: "#ef4444" },
    ]
  }, [claims, t])

  const hasClaimsData = claims.length > 0

  const usefulAlerts = useMemo(() => {
    const items: string[] = []

    if (studentClass?.startDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDay = new Date(studentClass.startDate)
      startDay.setHours(0, 0, 0, 0)
      const daysUntil = Math.round((startDay.getTime() - today.getTime()) / 86_400_000)

      if (daysUntil > 0) {
        items.push(
          t("stu_alert_rentree_future")
            .replace("{date}", classStartLabel)
            .replace("{days}", String(daysUntil)),
        )
      } else if (daysUntil === 0) {
        items.push(t("stu_alert_rentree_today").replace("{date}", classStartLabel))
      } else {
        items.push(t("stu_alert_rentree_past").replace("{date}", classStartLabel))
      }
    }

    if (summary.remainingAmount > 0) {
      items.push(
        t("stu_alert_remain_amount").replace("{amount}", formatFcfa(summary.remainingAmount)),
      )
    } else if (summary.totalTuition > 0 || summary.isScholarshipHolder) {
      items.push(t("stu_alert_paid_full"))
    }

    const pendingClaims = claims.filter(
      (c) => c.status === "en_attente" || c.status === "en_cours",
    ).length
    if (pendingClaims > 0) {
      items.push(t("stu_alert_claims_pending").replace("{count}", String(pendingClaims)))
    }

    const hasSettledPayments = payments.some(
      (p) => p.status === undefined || p.status === "successful",
    )
    if (hasSettledPayments) {
      items.push(t("stu_alert_receipts"))
    }

    return items
  }, [studentClass, classStartLabel, summary, claims, payments, t, formatFcfa])

  const statusValid = t("stu_status_ok")

  if (error) {
    return <DataLoadError fullScreen onRetry={handleRetry} retrying={retrying} />
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex-1 px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
          <div className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold md:text-2xl text-balance">{t("stu_space_title")}</h1>
                {studentClass ? (
                  <p className="mt-1 text-sm font-medium text-primary-foreground/90">{studentClass.title}</p>
                ) : null}
                <nav className="mt-1 flex items-center gap-1.5 text-sm text-primary-foreground/70">
                  <Home className="size-3.5" />
                  <ChevronRight className="size-3" />
                  <span>{t("stu_breadcrumb_dashboard")}</span>
                </nav>
              </div>

              <Link
                href="/dashboard/effectuer-paiement"
                className="mt-2 inline-flex items-center gap-2 self-start rounded-lg bg-primary-foreground/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-primary-foreground/30 sm:mt-0"
              >
                <Sparkles className="size-4" />
                {t("stu_header_pay")}
              </Link>
            </div>
          </div>
          <div className="bg-black/10 px-5 py-3 text-xs text-primary-foreground/90">{t("stu_hero_sub")}</div>
        </div>

        {summary.isScholarshipHolder ? (
          <div className="mt-4">
            <ScholarshipBanner summary={summary} />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map((kpi) => (
            <StudentKpiTile
              key={kpi.label}
              categoryLabel={kpi.categoryLabel}
              categoryHref={kpi.categoryHref}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              periodLabel={kpi.periodLabel}
              series={kpi.series}
              tone={kpi.tone}
              loading={kpi.loading}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChartIcon className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("stu_pie_pay_title")}</h3>
              </div>
              <span className="text-xs text-muted-foreground">{t("stu_pie_semester")}</span>
            </div>
            {loading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : hasChannelData ? (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentChannels} dataKey="value" nameKey="name" innerRadius={50} outerRadius={74} paddingAngle={2}>
                        {paymentChannels.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {paymentChannels.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                {t("stu_chart_empty")}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("stu_pie_claim_title")}</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {claims.length} {t("stu_claim_tip")}
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : hasClaimsData ? (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={claimsStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={74} paddingAngle={3}>
                        {claimsStatus.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} ${t("stu_claim_tip")}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {claimsStatus.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                {t("stu_chart_empty")}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("stu_pay_recent")}</h3>
              </div>
              <Link
                href="/dashboard/mes-paiements"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {t("stu_link_payments")}
                <ChevronRight className="size-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" />
                ))
              ) : recentPayments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  {t("stu_recent_empty")}
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{payment.label}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          payment.status === statusValid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{payment.date}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{payment.amount}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileClock className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("stu_adm_status")}</h3>
              </div>
              <div className="space-y-3">
                {schoolCertLoading ? (
                  <Skeleton className="h-24 w-full rounded-lg" />
                ) : (
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium text-foreground">{adminStatus.label}</p>
                    {adminStatus.hint ? (
                      <p className="mt-1 text-xs text-muted-foreground">{adminStatus.hint}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${adminStatus.tone}`}
                      >
                        {adminStatus.icon}
                        {adminStatus.value}
                      </span>
                      {adminStatus.canDownload ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => void downloadSchoolCertificate()}
                        >
                          <Download className="mr-1 size-3" />
                          {t("stu_adm_download")}
                        </Button>
                      ) : (
                        <Link
                          href="/dashboard/mon-profil"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {t("stu_adm_profile_link")}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("stu_alerts")}</h3>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {loading || classLoading ? (
                  <Skeleton className="h-16 w-full rounded-lg" />
                ) : usefulAlerts.length === 0 ? (
                  <p>{t("stu_alert_none")}</p>
                ) : (
                  usefulAlerts.map((alert) => (
                    <p key={alert}>- {alert}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
