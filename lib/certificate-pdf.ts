import type { Certificate, CertificateLevel } from "@/domains/certificates/types"
import { SignatureService } from "@/services/signature.service"

const EVALUATION_TRANSLATIONS: Record<string, string> = {
  Outstanding: "mit sehr gutem Erfolg / Outstanding",
  Good: "mit gutem Erfolg / Good",
  Satisfactory: "mit Erfolg / Satisfactory",
  Participant: "Teilgenommen / Participant",
}

const COURSE_INFO_TRANSLATIONS: Record<string, string> = {
  "Complete level": "Komplette Stufe / Complete level",
  "Partially completed level": "Teilweise absolvierte Stufe / Partially completed level",
  "Course dropped out": "Kurs abgebrochen / Course dropped out",
  "No participation": "Keine Teilnahme / No participation",
}

const LEVELS: CertificateLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"]

/** Nom affiché en repli si l'image de signature (/images/signature.png) est absente. */
const SIGNATURE_NAME = "La Direction / Management"

function formatDate(value: string | Date): string {
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return "—"
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return "—"
  }
}

async function loadImage(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const blob = await fetch(url).then((r) => r.blob())
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("IMAGE_READ_FAILED"))
      reader.readAsDataURL(blob)
    })
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"))
      img.src = dataUrl
    })
    return { dataUrl, width: dims.width, height: dims.height }
  } catch {
    return null
  }
}

type Seg = { text: string; bold?: boolean }

export interface CertificatePdfOptions {
  /** Aperçu admin avant validation — filigrane « APERÇU ». */
  preview?: boolean
}

async function loadSignatureImage(source: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (source.startsWith("data:image")) {
    try {
      const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"))
        img.src = source
      })
      return { dataUrl: source, width: dims.width, height: dims.height }
    } catch {
      return null
    }
  }
  return loadImage(source)
}

function resolveFormationSignatureSource(certificate: Certificate, options?: CertificatePdfOptions): string {
  const snapshot = certificate.signatureSnapshotUrl
  if (typeof snapshot === "string" && snapshot.startsWith("data:image")) {
    return snapshot
  }
  if (certificate.status === "disponible" && !options?.preview) {
    return "/images/signature.png"
  }
  return SignatureService.get() ?? "/images/signature.png"
}

export async function downloadCertificatePdf(certificate: Certificate, options?: CertificatePdfOptions) {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")

  const signatureSource = resolveFormationSignatureSource(certificate, options)
  const [glonet, bgs, signature] = await Promise.all([
    loadImage("/images/logo.png"),
    loadImage("/images/bgs-logo.png"),
    loadSignatureImage(signatureSource),
  ])

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 50
  const contentWidth = pageWidth - marginLeft * 2

  const setOpacity = (value: number): boolean => {
    try {
      const d = doc as unknown as { GState: (o: { opacity: number }) => unknown; setGState: (g: unknown) => void }
      d.setGState(d.GState({ opacity: value }))
      return true
    } catch {
      return false
    }
  }

  if (glonet && setOpacity(0.06)) {
    const size = 320
    doc.addImage(glonet.dataUrl, "PNG", (pageWidth - size) / 2, (pageHeight - size) / 2, size, size)
    setOpacity(1)
  }

  if (bgs) {
    const w = 80
    const h = w * (bgs.height / bgs.width)
    doc.addImage(bgs.dataUrl, "PNG", marginLeft, 28, w, h)
  }
  if (glonet) {
    const w = 70
    const h = w * (glonet.height / glonet.width)
    doc.addImage(glonet.dataUrl, "PNG", pageWidth - marginLeft - w, 18, w, h)
  }

  const titleY = 135
  const title = "TEILNAHMEBESTÄTIGUNG / ATTESTATION"
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(0, 102, 204)
  doc.text(title, pageWidth / 2, titleY, { align: "center" })
  const titleWidth = doc.getTextWidth(title)
  doc.setDrawColor(0, 102, 204)
  doc.setLineWidth(1.5)
  doc.line(pageWidth / 2 - titleWidth / 2 - 19, titleY + 5, pageWidth / 2 + titleWidth / 2 + 19, titleY + 5)
  doc.setTextColor(0, 0, 0)

  let y = titleY + 45

  const writeInline = (segments: Seg[], size = 11) => {
    doc.setFontSize(size)
    let x = marginLeft
    for (const seg of segments) {
      doc.setFont("helvetica", seg.bold ? "bold" : "normal")
      doc.text(seg.text, x, y)
      x += doc.getTextWidth(seg.text)
    }
    doc.setFont("helvetica", "normal")
  }

  const writeWrapped = (text: string, size = 11, lineHeight = 15) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, contentWidth) as string[]
    for (const ln of lines) {
      doc.text(ln, marginLeft, y)
      y += lineHeight
    }
  }

  writeInline([
    { text: "Referenznummer / Reference number : " },
    { text: certificate.referenceNumber, bold: true },
  ])
  y += 24

  writeInline([
    { text: "Name, Vorname / Surname, First name: " },
    { text: certificate.fullName, bold: true },
  ])
  y += 18

  writeInline([
    { text: "geboren am / Date of birth: " },
    { text: formatDate(certificate.dateOfBirth), bold: true },
    { text: "    geboren in / Place of birth: " },
    { text: certificate.placeOfBirth, bold: true },
  ])
  y += 32

  writeInline([
    { text: "hat in der Zeit vom / attended from " },
    { text: formatDate(certificate.courseStartDate), bold: true },
    { text: " bis / to " },
    { text: formatDate(certificate.courseEndDate), bold: true },
  ])
  y += 16
  writeWrapped(
    "an einem Deutschkurs im BGS Sarl Douala Sprachzentrum teilgenommen / a course in the german language.",
  )
  y += 14
  writeInline([
    { text: "Der Kurs umfasste / The course consisted in " },
    { text: String(certificate.lessonUnits), bold: true },
  ])
  y += 16
  writeWrapped("Unterrichtseinheiten von jeweils 45 Minuten / lessons of 45 minutes.")
  y += 16

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text("Referenzniveau des Kurses / Reference Level of the course:", marginLeft, y)
  y += 18

  const boxSize = 11
  const spacing = 40
  let boxX = marginLeft
  for (const level of LEVELS) {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.8)
    doc.rect(boxX, y - boxSize + 2, boxSize, boxSize, "S")
    if (level === certificate.referenceLevel) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("X", boxX + 2, y)
    }
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(level, boxX + boxSize + 5, y)
    boxX += spacing
  }
  y += 30

  writeInline([
    { text: "Kursinfo / Course Information: " },
    { text: COURSE_INFO_TRANSLATIONS[certificate.courseInfo] ?? certificate.courseInfo, bold: true },
  ])
  y += 18
  writeInline([
    { text: "Bemerkungen / Comments on the course: " },
    { text: certificate.comments?.trim() || "-", bold: true },
  ])
  y += 18
  writeInline([
    { text: "Besuchte Unterrichtseinheiten / Number of lessons attended: " },
    { text: String(certificate.lessonsAttended), bold: true },
  ])
  y += 18
  writeInline([
    { text: "Bewertung / Evaluation: " },
    { text: EVALUATION_TRANSLATIONS[certificate.evaluation] ?? certificate.evaluation, bold: true },
  ])
  y += 28

  writeWrapped(
    "Diese Teilnahmebestätigung ist kein Zeugnis. Die Beurteilung der Kursleistungen erfolgte durch die Lehrerperson(en).",
    10,
    13,
  )
  writeWrapped(
    "Die Bewertungsskala umfasst folgende Einteilung: mit sehr gutem Erfolg, mit gutem Erfolg, mit Erfolg, Teilgenommen.",
    10,
    13,
  )
  y += 8
  writeWrapped(
    "This is a certificate of attendance only, not a formal qualification. Grades were awarded by the course tutor(s).",
    10,
    13,
  )
  writeWrapped("The range of grades is: Outstanding, Good, Satisfactory, Participant.", 10, 13)
  y += 40

  const signatureY = y
  const center = pageWidth / 2
  doc.setFontSize(11)
  const dateText = `Douala, ${formatDate(new Date())}`
  const sigLine = "________________________"
  const sigLineWidth = doc.getTextWidth(sigLine)
  const leftX = center - sigLineWidth - 30
  const rightX = center + 30

  doc.setFont("helvetica", "bold")
  doc.text(dateText, leftX + 20, signatureY)
  doc.setFont("helvetica", "normal")
  doc.text(sigLine, leftX, signatureY + 6)
  doc.text("Ort und Datum / Place and date", leftX, signatureY + 20)

  if (signature) {
    const w = 120
    const h = Math.min(46, w * (signature.height / signature.width))
    doc.addImage(signature.dataUrl, "PNG", rightX, signatureY + 4 - h, w, h)
  } else {
    doc.setFont("helvetica", "italic")
    doc.text(SIGNATURE_NAME, rightX + 10, signatureY)
    doc.setFont("helvetica", "normal")
  }
  doc.text(sigLine, rightX, signatureY + 6)
  doc.text("Leitung / Management", rightX + 20, signatureY + 20)
  y = signatureY + 50

  doc.setDrawColor(0, 102, 204)
  doc.setLineWidth(3)
  doc.line(marginLeft, y, pageWidth - marginLeft, y)
  y += 24

  doc.setFontSize(10)
  doc.setTextColor(51, 51, 51)
  doc.text("Siège: Douala-Cameroun | N° Contr.: M032118559287D | RCCM NO: RC/DLA/2021/B/1719", pageWidth / 2, y, {
    align: "center",
  })
  y += 14
  doc.text("E-Mail: kontakt@glonetz.com | Tel: +4915788372536 | Site web: www.glonetz.com", pageWidth / 2, y, {
    align: "center",
  })

  if (options?.preview) {
    doc.setTextColor(220, 38, 38)
    doc.setFontSize(52)
    doc.setFont("helvetica", "bold")
    doc.text("APERÇU", pageWidth / 2, pageHeight / 2 - 10, { align: "center" })
    doc.setFontSize(14)
    doc.text("Document non validé — en attente d'approbation", pageWidth / 2, pageHeight / 2 + 24, {
      align: "center",
    })
    doc.setTextColor(51, 51, 51)
    doc.setFont("helvetica", "normal")
  }

  const suffix = options?.preview ? "-apercu" : ""
  doc.save(`attestation-${certificate.referenceNumber}${suffix}.pdf`)
}

export async function downloadFormationCertificatePdf(
  certificate: Certificate,
  options?: CertificatePdfOptions,
  fetchCertificate?: (id: string) => Promise<Certificate | null>,
): Promise<void> {
  let resolved = certificate
  if (certificate.status === "disponible" && !options?.preview && fetchCertificate) {
    const fresh = await fetchCertificate(certificate.id)
    if (fresh) resolved = fresh
  }
  await downloadCertificatePdf(resolved, options)
}
