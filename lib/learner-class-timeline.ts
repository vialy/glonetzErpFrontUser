export interface LearnerClassTimelineEntry {
  enrollmentId: string
  classId: string
  className: string
  periodStart?: string
  periodEnd?: string
  tuitionDue: number
  enrolledAt: string
  leftAt?: string
  source: "initial" | "promotion" | "manual"
  isCurrent: boolean
  amountPaid: number
  paymentCount: number
  netExpected?: number
  scholarshipDiscount?: number
  remainingAmount?: number
  scholarshipIsFull?: boolean
}

export interface LearnerClassTimelineResponse {
  entries: LearnerClassTimelineEntry[]
  totalPaid: number
  currentClassId?: string
}

export function getTimelineEntryDisplay(entry: LearnerClassTimelineEntry) {
  const netDue = entry.netExpected ?? entry.tuitionDue
  const remaining =
    entry.remainingAmount ?? Math.max(0, entry.tuitionDue - entry.amountPaid)
  const progressBase = netDue > 0 ? netDue : entry.tuitionDue
  const ratio =
    progressBase > 0
      ? Math.min(100, Math.round((entry.amountPaid / progressBase) * 100))
      : remaining <= 0
        ? 100
        : 0
  const hasFinancialOverlay = entry.netExpected != null
  const hasScholarshipBreakdown =
    hasFinancialOverlay &&
    (entry.scholarshipIsFull === true || (entry.scholarshipDiscount ?? 0) > 0)
  return { netDue, remaining, ratio, hasFinancialOverlay, hasScholarshipBreakdown }
}

export function formatTimelineDate(iso: string | undefined, locale = "fr-FR"): string {
  if (!iso) return "—"
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
}

export function sourceLabel(source: LearnerClassTimelineEntry["source"]): string {
  switch (source) {
    case "promotion":
      return "Promotion"
    case "manual":
      return "Changement de classe"
    default:
      return "Inscription"
  }
}
