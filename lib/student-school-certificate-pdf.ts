import type { Certificate, CertificateLevel } from "@/domains/certificates/types"
import type { StudentSchoolCertificate } from "@/lib/student-school-certificate"
import { downloadSchoolCertificatePdf } from "@/lib/school-certificate-pdf"

export function studentCertToCertificate(cert: StudentSchoolCertificate): Certificate {
  const level = (["A1", "A2", "B1", "B2", "C1", "C2"] as CertificateLevel[]).includes(
    cert.referenceLevel as CertificateLevel,
  )
    ? (cert.referenceLevel as CertificateLevel)
    : "A1"

  const slotMap: Record<string, string> = {
    Matin: "MO",
    Midi: "MI",
    "Apres-midi": "NM",
    Soir: "AB",
    MO: "MO",
    MI: "MI",
    NM: "NM",
    AB: "AB",
  }
  const timeSlot = slotMap[cert.timeSlot] ?? "AB"

  return {
    id: cert.id,
    referenceNumber: cert.referenceNumber,
    certificateKind: "scolarite",
    fullName: cert.fullName,
    dateOfBirth: cert.dateOfBirth,
    placeOfBirth: cert.placeOfBirth,
    referenceLevel: level,
    courseStartDate: cert.courseStartDate,
    courseEndDate: cert.courseEndDate,
    lessonUnits: 0,
    lessonsAttended: 0,
    courseInfo: "Complete level",
    evaluation: "Participant",
    className: cert.className,
    timeSlot,
    status: "disponible",
    createdByRole: "admin",
    createdAt: new Date().toISOString(),
  }
}

export async function downloadStudentSchoolCertificatePdf(cert: StudentSchoolCertificate): Promise<void> {
  await downloadSchoolCertificatePdf(studentCertToCertificate(cert))
}
