"use client"

export interface TrainingCertificate {
  id: string
  level: string
  status: "en_cours" | "disponible"
  issuedAt?: string
}

const STORAGE_KEY = "glonetz_certificates_v1"
const ENROLLED_LEVEL_KEY = "glonetz_student_enrolled_level_v1"
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const

const DEFAULT_CERTIFICATES: TrainingCertificate[] = [
  { id: "cert-a1", level: "A1", status: "disponible", issuedAt: "2025-11-08T10:30:00.000Z" },
  { id: "cert-a2", level: "A2", status: "en_cours" },
  { id: "cert-b1", level: "B1", status: "en_cours" },
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
    const enrolledLevel = this.getEnrolledLevel()
    const maxIndex = LEVEL_ORDER.indexOf(enrolledLevel as (typeof LEVEL_ORDER)[number])
    return this.getAll().filter((certificate) => {
      const idx = LEVEL_ORDER.indexOf(certificate.level as (typeof LEVEL_ORDER)[number])
      return idx !== -1 && idx <= maxIndex
    })
  },
}

