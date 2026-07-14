import type { StudentSchoolCertificate } from "@/lib/student-school-certificate"
import { SchoolCertificateTemplateService } from "@/services/school-certificate-template.service"

export function canStudentDownloadSchoolCertificate(
  _certificate: StudentSchoolCertificate,
  tuitionFullyPaid: boolean,
  options?: { templateReady?: boolean; canDownload?: boolean },
): { allowed: boolean; reason?: string } {
  if (options?.canDownload === true) return { allowed: true }

  const templateReady = options?.templateReady ?? SchoolCertificateTemplateService.isReadyForLearnerDownload()
  if (!templateReady) {
    return {
      allowed: false,
      reason:
        "Le certificat n'est pas encore disponible. L'établissement doit valider le cachet et la signature.",
    }
  }
  if (!tuitionFullyPaid) {
    return {
      allowed: false,
      reason: "Votre pension doit être entièrement réglée pour télécharger le certificat de scolarité.",
    }
  }
  if (options?.canDownload === false) {
    return {
      allowed: false,
      reason: "Le certificat n'est pas encore disponible. Contactez l'établissement.",
    }
  }
  return { allowed: true }
}
