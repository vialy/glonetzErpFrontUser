"use client"

import { apiRequest } from "@/core/api/client"
import { parseClassEnrollmentList } from "@/lib/learner-enrollment-api-mapper"

export interface LearnerClassEnrollment {
  id: string
  learnerId: string
  classId: string
  className: string
  periodStart?: string
  periodEnd?: string
  tuitionDue: number
  enrolledAt: string
  leftAt?: string
  isActive?: boolean
  source: "initial" | "promotion" | "manual"
}

const ENROLLMENT_PAGE_SIZE = 100

export const ENROLLMENTS_UPDATED_EVENT = "student-enrollments-updated"

/** Demo : parcours A1 puis A2 pour l'apprenant connecté en mock. */
const DEMO_ENROLLMENTS: LearnerClassEnrollment[] = [
  {
    id: "ENR-DEMO-a1",
    learnerId: "USR-DEMO",
    classId: "a1-jan-2025",
    className: "A1 - Jan 2025",
    periodStart: "2025-01-01",
    periodEnd: "2025-06-30",
    tuitionDue: 162_000,
    enrolledAt: "2025-01-10",
    leftAt: "2026-03-10T09:20:00.000Z",
    source: "initial",
  },
  {
    id: "ENR-DEMO-a2",
    learnerId: "USR-DEMO",
    classId: "a2-apr-2025",
    className: "A2 - Apr 2025",
    periodStart: "2025-04-01",
    periodEnd: "2025-09-30",
    tuitionDue: 170_000,
    enrolledAt: "2026-03-10T09:20:00.000Z",
    isActive: true,
    source: "promotion",
  },
]

function isApiDataProvider() {
  return (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api"
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readAll(): LearnerClassEnrollment[] {
  if (!canUseStorage()) return DEMO_ENROLLMENTS
  const raw = localStorage.getItem("glonetz_student_enrollments_v1")
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function seedForUser(userId: string) {
  if (readAll().some((r) => r.learnerId === userId)) return
  if (userId === "USR-DEMO") {
    if (!canUseStorage()) return
    localStorage.setItem("glonetz_student_enrollments_v1", JSON.stringify(DEMO_ENROLLMENTS))
    window.dispatchEvent(new Event(ENROLLMENTS_UPDATED_EVENT))
  }
}

async function fetchMyEnrollments(learnerId: string): Promise<LearnerClassEnrollment[]> {
  const data = await apiRequest<unknown>("/users/my-classes", {
    method: "GET",
    query: { pageNum: 1, pageSize: ENROLLMENT_PAGE_SIZE },
  })
  return parseClassEnrollmentList(data, learnerId)
}

export const LearnerEnrollmentService = {
  getForLearner(learnerId: string): LearnerClassEnrollment[] {
    if (isApiDataProvider()) return []
    seedForUser(learnerId)
    return readAll()
      .filter((r) => r.learnerId === learnerId)
      .sort((a, b) => new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime())
  },

  async fetchForLearner(learnerId: string): Promise<LearnerClassEnrollment[]> {
    if (isApiDataProvider()) {
      return fetchMyEnrollments(learnerId)
    }
    return this.getForLearner(learnerId)
  },
}
