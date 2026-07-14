"use client"

import type { SchoolCertificatesProvider } from "@/domains/school-certificates/types"
import { buildStudentSchoolCertificate } from "@/lib/student-school-certificate"
import { SchoolCertificateTemplateService } from "@/services/school-certificate-template.service"

export const mockSchoolCertificatesProvider: SchoolCertificatesProvider = {
  async getMine() {
    const certificate = buildStudentSchoolCertificate({ studentName: "Etudiant Demo" })
    const tuitionFullyPaid = false
    const templateReady = SchoolCertificateTemplateService.isReadyForLearnerDownload()
    return {
      certificate: null,
      tuitionFullyPaid,
      templateReady,
      canDownload: templateReady && tuitionFullyPaid,
      // Mock path keeps local build in profile; mine is only used in API mode.
    }
  },
}
