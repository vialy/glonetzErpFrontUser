import type { Certificate } from "@/domains/certificates/types"

export interface StudentSchoolCertificateMine {
  certificate: Certificate | null
  tuitionFullyPaid: boolean
  templateReady: boolean
  canDownload: boolean
}

export interface SchoolCertificatesProvider {
  getMine(): Promise<StudentSchoolCertificateMine>
}
