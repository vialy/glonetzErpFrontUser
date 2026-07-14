"use client"

import type { TrainingCertificate } from "@/domains/certificates/types"

const STORAGE_KEY = "glonetz_certificates_v1"
const ENROLLED_LEVEL_KEY = "glonetz_student_enrolled_level_v1"
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const

const MOCK_CERTIFICATE_BASE = {
  certificateKind: "formation" as const,
  fullName: "Etudiant Demo",
  dateOfBirth: "2000-01-15",
  placeOfBirth: "Douala",
  courseStartDate: "2025-01-06",
  courseEndDate: "2025-06-30",
  lessonUnits: 120,
  lessonsAttended: 115,
  courseInfo: "Complete level" as const,
  evaluation: "Good" as const,
  comments: "",
  className: "A1 Matin",
  timeSlot: "MO",
  createdByRole: "admin" as const,
  createdAt: "2025-11-08T10:30:00.000Z",
}

const DEFAULT_CERTIFICATES: TrainingCertificate[] = [
  {
    ...MOCK_CERTIFICATE_BASE,
    id: "cert-a1",
    referenceNumber: "GLZ-2025-A1-0001",
    referenceLevel: "A1",
    status: "disponible",
    issuedAt: "2025-11-08T10:30:00.000Z",
  },
  {
    ...MOCK_CERTIFICATE_BASE,
    id: "cert-a2",
    referenceNumber: "GLZ-2025-A2-0001",
    referenceLevel: "A2",
    status: "en_attente",
    className: "A2 Midi",
    timeSlot: "MI",
  },
  {
    ...MOCK_CERTIFICATE_BASE,
    id: "cert-b1",
    referenceNumber: "GLZ-2025-B1-0001",
    referenceLevel: "B1",
    status: "brouillon",
    className: "B1 Soir",
    timeSlot: "AB",
  },
]

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export const CertificatesService = {
  getEnrolledLevel(): string {
    if (!canUseStorage()) return "A2"
    const stored = localStorage.getItem(ENROLLED_LEVEL_KEY)
    return stored && LEVEL_ORDER.includes(stored as (typeof LEVEL_ORDER)[number]) ? stored : "A2"
  },

  setEnrolledLevel(level: string) {
    if (!canUseStorage()) return
    if (!LEVEL_ORDER.includes(level as (typeof LEVEL_ORDER)[number])) return
    localStorage.setItem(ENROLLED_LEVEL_KEY, level)
  },

  getAll(): TrainingCertificate[] {
    if (!canUseStorage()) return DEFAULT_CERTIFICATES
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CERTIFICATES))
      return DEFAULT_CERTIFICATES
    }
    try {
      const parsed = JSON.parse(raw) as TrainingCertificate[]
      return Array.isArray(parsed) ? parsed : DEFAULT_CERTIFICATES
    } catch {
      return DEFAULT_CERTIFICATES
    }
  },

  getForStudent(): TrainingCertificate[] {
    return this.getAll().filter((certificate) => certificate.status === "disponible")
  },
}
