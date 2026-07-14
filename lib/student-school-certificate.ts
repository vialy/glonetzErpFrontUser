import type { StudentClass } from "@/types"

export interface StudentSchoolCertificate {
  id: string
  referenceNumber: string
  fullName: string
  dateOfBirth: string
  placeOfBirth: string
  referenceLevel: string
  courseStartDate: string
  courseEndDate: string
  className: string
  timeSlot: string
  timeSlotHours: string
}

const TIME_SLOT_HOURS: Record<string, string> = {
  MO: "08h00 - 11h00",
  MI: "11h15 - 14h30",
  NM: "14h45 - 17h45",
  AB: "18h00 - 21h00",
}

const TIME_SLOT_LABELS: Record<string, string> = {
  MO: "Matin",
  MI: "Midi",
  NM: "Apres-midi",
  AB: "Soir",
}

export function apiCertificateToStudentSchoolCertificate(cert: {
  id: string
  referenceNumber: string
  fullName: string
  dateOfBirth: string
  placeOfBirth: string
  referenceLevel: string
  courseStartDate: string
  courseEndDate: string
  className?: string
  timeSlot?: string
}): StudentSchoolCertificate {
  const slot = cert.timeSlot ?? "MO"
  return {
    id: cert.id,
    referenceNumber: cert.referenceNumber,
    fullName: cert.fullName,
    dateOfBirth: cert.dateOfBirth,
    placeOfBirth: cert.placeOfBirth,
    referenceLevel: cert.referenceLevel,
    courseStartDate: cert.courseStartDate,
    courseEndDate: cert.courseEndDate,
    className: cert.className ?? "—",
    timeSlot: TIME_SLOT_LABELS[slot] ?? slot,
    timeSlotHours: TIME_SLOT_HOURS[slot] ?? "",
  }
}

export function buildStudentSchoolCertificate(input: {
  studentName: string
  dateOfBirth?: string
  placeOfBirth?: string
  studentClass?: StudentClass | null
  timeSlotCode?: string
}): StudentSchoolCertificate {
  const levelMatch = input.studentClass?.title?.match(/\b(A1|A2|B1|B2|C1|C2)\b/i)
  const level = levelMatch?.[1]?.toUpperCase() ?? "A1"
  const slot = input.timeSlotCode ?? "MO"
  const year = new Date().getFullYear()
  return {
    id: `scol-student-${year}`,
    referenceNumber: `SCOL-${year}-STUDENT`,
    fullName: input.studentName,
    dateOfBirth: input.dateOfBirth ?? "",
    placeOfBirth: input.placeOfBirth ?? "",
    referenceLevel: level,
    courseStartDate: input.studentClass?.startDate ?? "",
    courseEndDate: input.studentClass?.endDate ?? "",
    className: input.studentClass?.title ?? "—",
    timeSlot: TIME_SLOT_LABELS[slot] ?? slot,
    timeSlotHours: TIME_SLOT_HOURS[slot] ?? "",
  }
}
