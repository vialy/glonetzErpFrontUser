import type { TrainingCertificate } from "@/domains/certificates"

export async function downloadStudentCertificatePdf(options: {
  certificate: TrainingCertificate
  studentName: string
  labels: {
    title: string
    certifies: string
    validated: string
    program: string
    issue: string
    ref: string
    sign: string
  }
  formatDateShort: (value: string) => string
  locale: "fr" | "en"
}) {
  const { certificate, studentName, labels, formatDateShort, locale } = options
  if (certificate.status !== "disponible") return

  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")

  const logoDataUrl = await fetch("/images/logo.png")
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error("LOGO_READ_FAILED"))
          reader.readAsDataURL(blob)
        }),
    )
    .catch(() => "")

  const issueDate = certificate.issuedAt
    ? formatDateShort(certificate.issuedAt)
    : new Date().toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, pageWidth, pageHeight, "F")
  doc.setDrawColor(37, 99, 235)
  doc.setLineWidth(1.2)
  doc.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 4, 4, "S")

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 18, 16, 38, 13)
  }

  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.setFontSize(26)
  doc.text(labels.title, pageWidth / 2, 46, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setTextColor(51, 65, 85)
  doc.setFontSize(13)
  doc.text(labels.certifies, pageWidth / 2, 62, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(22)
  doc.text(studentName, pageWidth / 2, 78, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setTextColor(51, 65, 85)
  doc.setFontSize(13)
  doc.text(`${labels.validated} ${certificate.level} ${labels.program}`, pageWidth / 2, 92, { align: "center" })

  doc.setFontSize(11)
  doc.text(`${labels.issue} ${issueDate}`, 24, pageHeight - 30)
  doc.text(`${labels.ref} ${certificate.id.toUpperCase()}`, pageWidth - 24, pageHeight - 30, { align: "right" })

  doc.setDrawColor(148, 163, 184)
  doc.line(24, pageHeight - 24, 84, pageHeight - 24)
  doc.text(labels.sign, 24, pageHeight - 18)

  doc.save(`attestation-${certificate.level.toLowerCase()}-${studentName.replace(/\s+/g, "-")}.pdf`)
}
