import type { Certificate } from "@/domains/certificates/types"
import { certificatesService } from "@/domains/certificates/service"
import { downloadFormationCertificatePdf } from "@/lib/certificate-pdf"

function isApiDataProvider() {
  return (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api"
}

/** Même PDF que l'admin — signature = snapshot MongoDB (`signatureSnapshotUrl`). */
export async function downloadStudentCertificatePdf(certificate: Certificate): Promise<void> {
  if (certificate.status !== "disponible") return

  const fetchCertificate = isApiDataProvider()
    ? (id: string) => certificatesService.getById(id)
    : undefined

  await downloadFormationCertificatePdf(certificate, undefined, fetchCertificate)
}
