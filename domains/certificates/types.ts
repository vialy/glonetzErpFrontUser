export const CERTIFICATE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export type CertificateLevel = (typeof CERTIFICATE_LEVELS)[number]

export const COURSE_INFO_OPTIONS = [
  "Complete level",
  "Partially completed level",
  "Course dropped out",
  "No participation",
] as const
export type CourseInfo = (typeof COURSE_INFO_OPTIONS)[number]

export const EVALUATION_OPTIONS = ["Outstanding", "Good", "Satisfactory", "Participant"] as const
export type Evaluation = (typeof EVALUATION_OPTIONS)[number]

export type CertificateStatus = "brouillon" | "en_attente" | "disponible"
export type CertificateKind = "formation" | "scolarite"
export type CertificateCreatorRole = "admin" | "manager"

export interface Certificate {
  id: string
  referenceNumber: string
  certificateKind?: CertificateKind
  fullName: string
  dateOfBirth: string
  placeOfBirth: string
  referenceLevel: CertificateLevel
  courseStartDate: string
  courseEndDate: string
  lessonUnits: number
  lessonsAttended: number
  courseInfo: CourseInfo | string
  evaluation: Evaluation | string
  comments?: string
  className?: string
  timeSlot?: string
  status: CertificateStatus
  createdByRole: CertificateCreatorRole
  signatureSnapshotUrl?: string
  issuedAt?: string
  createdAt: string
}

/** Alias conservé pour le portail apprenant (attestations de formation). */
export type TrainingCertificate = Certificate

export interface CertificatesProvider {
  getEnrolledLevel(): Promise<string>
  setEnrolledLevel(level: string): Promise<void>
  getAll(): Promise<TrainingCertificate[]>
  getForStudent(): Promise<TrainingCertificate[]>
  getById(id: string): Promise<TrainingCertificate | null>
}
