import type { Certificate, CertificateLevel } from "@/domains/certificates/types"
import {
  isClassTimeSlot,
  normalizeStoredClassTimeSlot,
  type ClassTimeSlot,
} from "@/lib/class-metadata"
import {
  fitImageInSchoolCertBox,
  resolveSignaturePlacement,
  resolveStampPlacement,
} from "@/lib/school-cert-placement"
import { SignatureService } from "@/services/signature.service"
import { StampService } from "@/services/stamp.service"
import {
  SchoolCertificateTemplateService,
  type SchoolCertificateTemplate,
} from "@/services/school-certificate-template.service"

const SCHOOL_LEVELS: CertificateLevel[] = ["A1", "A2", "B1", "B2"]

/** Format horaire compact FR (modèle MAIVA, ex. 18H-21h). */
const TIME_SLOT_COMPACT_FR: Record<ClassTimeSlot, string> = {
  MO: "08H-11H",
  MI: "11H15-14H30",
  NM: "14H45-17H45",
  AB: "18H-21h",
}

/** Format horaire compact DE (modèle MAIVA, ex. 18H bis 21Uhr). */
const TIME_SLOT_COMPACT_DE: Record<ClassTimeSlot, string> = {
  MO: "08H bis 11Uhr",
  MI: "11H15 bis 14H30",
  NM: "14H45 bis 17H45",
  AB: "18H bis 21Uhr",
}

const SIGNATURE_LABEL = "Le/la Responsable / Leitung"

function sectionContent(template: SchoolCertificateTemplate, id: string, fallback: string): string {
  return template.sections.find((s) => s.id === id)?.content ?? fallback
}

function applyVars(text: string, vars: Record<string, string>): string {
  let out = text
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(key).join(value)
  }
  return out
}

function formatDate(value: string | Date): string {
  try {
    const date = value instanceof Date ? value : new Date(value.length <= 10 ? `${value}T12:00:00` : value)
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

type Seg = { text: string; bold?: boolean }

export interface SchoolCertificatePdfOptions {
  preview?: boolean
  draftWatermark?: string
  /** Aperçu depuis l'éditeur avant enregistrement. */
  templateOverride?: SchoolCertificateTemplate
}

/**
 * Certificat de scolarité — même logique de rendu que `certificate-pdf.ts`,
 * avec le texte et la structure du modèle MAIVA.
 */
export async function downloadSchoolCertificatePdf(
  certificate: Certificate,
  options?: SchoolCertificatePdfOptions,
): Promise<void> {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")

  const template =
    options?.templateOverride ?? SchoolCertificateTemplateService.get()

  const signatureSource =
    certificate.signatureSnapshotUrl ??
    template.signatureImageUrl ??
    SignatureService.get() ??
    "/images/signature.png"
  const stampSource = template.stampImageUrl ?? StampService.get()

  const [glonet, bgs, signature, stamp] = await Promise.all([
    loadImage("/images/logo.png"),
    loadImage("/images/bgs-logo.png"),
    loadSignatureImage(signatureSource),
    stampSource ? loadSignatureImage(stampSource) : Promise.resolve(null),
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

  // === FILIGRANE ===
  if (glonet && setOpacity(0.06)) {
    const size = 320
    doc.addImage(glonet.dataUrl, "PNG", (pageWidth - size) / 2, (pageHeight - size) / 2, size, size)
    setOpacity(1)
  }

  // === LOGOS ===
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

  // === TITRE ===
  const titleY = 135
  const title = template.documentTitle || "ATTESTATION DE PARTICIPATION/TEILNAHMEBESCHEINIGUNG"
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

  const issueDate = formatDate(new Date())
  const slot = normalizeStoredClassTimeSlot(certificate.timeSlot)
  const slotCode = isClassTimeSlot(slot) ? slot : "AB"
  const timeCompactFr = TIME_SLOT_COMPACT_FR[slotCode]
  const timeCompactDe = TIME_SLOT_COMPACT_DE[slotCode]
  const level = certificate.referenceLevel

  const vars: Record<string, string> = {
    "{{fullName}}": certificate.fullName,
    "{{dateOfBirth}}": formatDate(certificate.dateOfBirth),
    "{{placeOfBirth}}": certificate.placeOfBirth,
    "{{className}}": certificate.className ?? level,
    "{{referenceLevel}}": level,
    "{{periodStart}}": formatDate(certificate.courseStartDate),
    "{{periodEnd}}": formatDate(certificate.courseEndDate),
    "{{timeSlotCompact}}": timeCompactFr,
    "{{timeSlotCompactDe}}": timeCompactDe,
    "{{timeSlotHours}}": timeCompactFr,
    "{{issueDate}}": issueDate,
    "{{referenceNumber}}": certificate.referenceNumber,
  }

  // === RÉFÉRENCE & DATE ===
  writeInline([
    { text: "Référence / Referenznummer : " },
    { text: certificate.referenceNumber, bold: true },
  ])
  y += 24

  writeInline([
    { text: "Lieu et date / Ort und Datum : " },
    { text: `Douala, ${issueDate}`, bold: true },
  ])
  y += 32

  // === INTRODUCTION ===
  writeWrapped(
    applyVars(
      sectionContent(
        template,
        "intro",
        "La direction du centre Glonetz certifie par la présente que / Die Leitung Zentrums Glonetz bescheinigt hiermit, dass:",
      ),
      vars,
    ),
  )
  y += 14

  // === IDENTITÉ ===
  writeInline([
    { text: "Nom de l'apprenant(e) / Name des Lernenden : " },
    { text: certificate.fullName, bold: true },
  ])
  y += 18

  writeInline([
    { text: "Date de naissance / Geburtsdatum : " },
    { text: formatDate(certificate.dateOfBirth), bold: true },
  ])
  y += 18

  writeInline([
    { text: "Lieu de naissance / Geburtsort : " },
    { text: certificate.placeOfBirth, bold: true },
  ])
  y += 32

  // === NIVEAU DE RÉFÉRENCE (cases à cocher, comme l'attestation de formation) ===
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text("Niveau de référence des cours / Referenzniveau des Kurses :", marginLeft, y)
  y += 18

  const boxSize = 11
  const spacing = 40
  let boxX = marginLeft
  for (const lv of SCHOOL_LEVELS) {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.8)
    doc.rect(boxX, y - boxSize + 2, boxSize, boxSize, "S")
    if (lv === level) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("X", boxX + 2, y)
    }
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(lv, boxX + boxSize + 5, y)
    boxX += spacing
  }
  y += 30

  // === CORPS DU CERTIFICAT (texte MAIVA) ===
  writeWrapped(
    applyVars(
      sectionContent(
        template,
        "body_fr",
        "Est actuellement inscrit(e) et suit des cours au sein de notre centre de langue Glonetz au niveau {{referenceLevel}}, pour la tranche horaire de {{timeSlotCompact}}. Cette attestation confirme la scolarité et la fréquentation régulière du centre à la date indiquée ci-dessus. Ce document est délivré à la demande de l'intéressé(e) et n'a pas la valeur d'un diplôme officiel.",
      ),
      vars,
    ),
  )
  y += 8
  writeWrapped(
    applyVars(
      sectionContent(
        template,
        "body_de",
        "Ist aktuell in unserem Sprachzentrum Glonetz eingeschrieben und besucht Kurse auf Niveau {{referenceLevel}} für den Zeitraum von {{timeSlotCompactDe}}. Dieses Zertifikat bestätigt den Schulbesuch und die regelmäßige Teilnahme am Zentrum zum oben angegebenen Datum. Dieses Dokument wird auf Antrag der betreffenden Person ausgestellt und hat nicht den Wert eines offiziellen Diploms.",
      ),
      vars,
    ),
  )
  y += 8
  writeWrapped(
    applyVars(
      sectionContent(
        template,
        "closing",
        "Cette attestation est établie uniquement pour servir et valoir ce que de droit. / Dieses Zertifikat dient ausschließlich den gesetzlich vorgeschriebenen Zwecken und ist für diese gültig.",
      ),
      vars,
    ),
  )
  y += 24

  // === SIGNATURE & CACHET (positions du modèle visuel) ===
  const stampBox = resolveStampPlacement(template)
  const sigBox = resolveSignaturePlacement(template)

  if (stamp) {
    const fitted = fitImageInSchoolCertBox(stampBox, pageWidth, pageHeight, stamp.width, stamp.height)
    doc.addImage(stamp.dataUrl, "PNG", fitted.x, fitted.y, fitted.width, fitted.height)
  }

  if (signature) {
    const fitted = fitImageInSchoolCertBox(sigBox, pageWidth, pageHeight, signature.width, signature.height)
    doc.addImage(signature.dataUrl, "PNG", fitted.x, fitted.y, fitted.width, fitted.height)
  }

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  const sigLine = "________________________"
  const sigLineX = sigBox.x * pageWidth
  const sigLineY = (sigBox.y + sigBox.height) * pageHeight - 4
  doc.text(sigLine, sigLineX, sigLineY)
  doc.text(SIGNATURE_LABEL, sigLineX, sigLineY + 16)

  y = Math.max(
    y,
    stamp ? (stampBox.y + stampBox.height) * pageHeight + 12 : 0,
    (sigBox.y + sigBox.height) * pageHeight + 28,
    pageHeight * 0.86,
  )

  // === SÉPARATEUR + CONTACT (modèle MAIVA) ===
  doc.setDrawColor(0, 102, 204)
  doc.setLineWidth(3)
  doc.line(marginLeft, y, pageWidth - marginLeft, y)
  y += 24

  doc.setFontSize(10)
  doc.setTextColor(51, 51, 51)
  doc.text(
    "Siège : Douala-Cameroun | N° Contr. : M032118559287D | RCCM N° : RC/DLA/2021/B/1719",
    pageWidth / 2,
    y,
    { align: "center" },
  )
  y += 14
  doc.text(
    "E-Mail : contact@bg-student.com | Tel : +491778625486 | Site web : www.bg-student.com",
    pageWidth / 2,
    y,
    { align: "center" },
  )

  if (options?.preview || options?.draftWatermark) {
    doc.setTextColor(220, 38, 38)
    doc.setFontSize(52)
    doc.setFont("helvetica", "bold")
    doc.text(options.draftWatermark ?? "APERÇU", pageWidth / 2, pageHeight / 2 - 10, { align: "center" })
    doc.setFontSize(14)
    doc.text("Document non validé", pageWidth / 2, pageHeight / 2 + 24, { align: "center" })
    doc.setTextColor(51, 51, 51)
    doc.setFont("helvetica", "normal")
  }

  const suffix = options?.preview ? "-apercu" : ""
  doc.save(`certificat-scolarite-${certificate.referenceNumber}${suffix}.pdf`)
}
