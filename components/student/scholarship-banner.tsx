"use client"

import type { StudentTuitionSummary } from "@/domains/payments"
import { useLocale } from "@/hooks/use-locale"

type ScholarshipBannerProps = {
  summary: Pick<
    StudentTuitionSummary,
    | "isScholarshipHolder"
    | "scholarshipIsFull"
    | "scholarshipDiscount"
    | "catalogTuition"
    | "totalTuition"
  >
}

export function ScholarshipBanner({ summary }: ScholarshipBannerProps) {
  const { t, locale } = useLocale()

  if (!summary.isScholarshipHolder) return null

  const formatFcfa = (value: number) =>
    `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} F CFA`

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
      <p className="font-semibold">{t("sp_scholarship_badge")}</p>
      {summary.scholarshipIsFull ? (
        <p className="mt-1 text-sky-800 dark:text-sky-200">{t("sp_scholarship_full")}</p>
      ) : (summary.scholarshipDiscount ?? 0) > 0 ? (
        <p className="mt-1 text-sky-800 dark:text-sky-200">
          {t("sp_catalog_fee")}: {formatFcfa(summary.catalogTuition ?? summary.totalTuition)} —{" "}
          {t("sp_scholarship_discount")}: −{formatFcfa(summary.scholarshipDiscount ?? 0)}
        </p>
      ) : null}
    </div>
  )
}
