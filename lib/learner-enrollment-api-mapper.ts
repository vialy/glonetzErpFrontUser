import type { LearnerClassEnrollment } from "@/services/learner-enrollment.service"

type ApiClassEnrollment = {
  classEnrollmentId?: string
  classFriendlyId?: string
  classTitle?: string
  classFee?: number
  classStartDate?: string
  classEndDate?: string
  joinedAt?: string
  leftAt?: string | null
  isActive?: boolean
  userFriendlyId?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function asIsoDate(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return undefined
}

function extractDocs(data: unknown): unknown[] {
  const root = asRecord(data)
  if (!root) return []
  if (Array.isArray(root.docs)) return root.docs
  if (Array.isArray(root.items)) return root.items
  const nested = asRecord(root.data)
  if (nested) {
    if (Array.isArray(nested.docs)) return nested.docs
    if (Array.isArray(nested.items)) return nested.items
  }
  return []
}

function mapDoc(
  raw: unknown,
  learnerId: string,
  chronologicalIndex: number,
): LearnerClassEnrollment | null {
  const row = asRecord(raw) as ApiClassEnrollment | null
  if (!row) return null

  const classId = asString(row.classFriendlyId)
  const id = asString(row.classEnrollmentId)
  if (!classId || !id) return null

  const joinedAt = asIsoDate(row.joinedAt)
  if (!joinedAt) return null

  const leftAt = asIsoDate(row.leftAt)

  return {
    id,
    learnerId,
    classId,
    className: asString(row.classTitle) ?? classId,
    periodStart: asIsoDate(row.classStartDate)?.slice(0, 10),
    periodEnd: asIsoDate(row.classEndDate)?.slice(0, 10),
    tuitionDue: asNumber(row.classFee) ?? 0,
    enrolledAt: joinedAt,
    leftAt,
    isActive: row.isActive === true,
    source: chronologicalIndex === 0 ? "initial" : "promotion",
  }
}

/** Map `GET /users/my-classes` docs → timeline rows. */
export function parseClassEnrollmentList(data: unknown, learnerId: string): LearnerClassEnrollment[] {
  const parsed = extractDocs(data)
    .map((doc, index) => mapDoc(doc, learnerId, index))
    .filter((row): row is LearnerClassEnrollment => row !== null)

  const sorted = [...parsed].sort(
    (a, b) => new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime(),
  )

  return sorted.map((row, index) => ({
    ...row,
    source: index === 0 ? "initial" : "promotion",
  }))
}
