import type { SchoolCertificateTemplate } from "@/services/school-certificate-template.service"

/** Position et taille normalisées (0–1) sur la page A4. */
export interface SchoolCertVisualPlacement {
  x: number
  y: number
  width: number
  height: number
}

export const A4_WIDTH_PT = 595.28
export const A4_HEIGHT_PT = 842

export const DEFAULT_STAMP_PLACEMENT: SchoolCertVisualPlacement = {
  x: 0.18,
  y: 0.74,
  width: 0.14,
  height: 0.11,
}

export const DEFAULT_SIGNATURE_PLACEMENT: SchoolCertVisualPlacement = {
  x: 0.52,
  y: 0.72,
  width: 0.24,
  height: 0.09,
}

export function cmToPt(cm: number): number {
  return cm * (72 / 2.54)
}

function clamp01(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function isValidPlacement(p: unknown): p is SchoolCertVisualPlacement {
  if (!p || typeof p !== "object") return false
  const o = p as SchoolCertVisualPlacement
  return [o.x, o.y, o.width, o.height].every((n) => typeof n === "number" && Number.isFinite(n))
}

function clampPlacement(p: SchoolCertVisualPlacement): SchoolCertVisualPlacement {
  const width = clamp01(p.width, 0.04, 0.5)
  const height = clamp01(p.height, 0.03, 0.35)
  return {
    x: clamp01(p.x, 0, 1 - width),
    y: clamp01(p.y, 0, 1 - height),
    width,
    height,
  }
}

export function placementFromCmOffsets(template: Pick<
  SchoolCertificateTemplate,
  "stampOffsetXCm" | "stampOffsetYCm" | "signatureOffsetXCm" | "signatureOffsetYCm"
>): {
  stamp: SchoolCertVisualPlacement
  signature: SchoolCertVisualPlacement
} {
  const stamp = { ...DEFAULT_STAMP_PLACEMENT }
  stamp.x += cmToPt(template.stampOffsetXCm) / A4_WIDTH_PT
  stamp.y += cmToPt(template.stampOffsetYCm) / A4_HEIGHT_PT

  const signature = { ...DEFAULT_SIGNATURE_PLACEMENT }
  signature.x += cmToPt(template.signatureOffsetXCm) / A4_WIDTH_PT
  signature.y += cmToPt(template.signatureOffsetYCm) / A4_HEIGHT_PT

  return { stamp: clampPlacement(stamp), signature: clampPlacement(signature) }
}

export function resolveStampPlacement(
  template: Partial<SchoolCertificateTemplate>,
): SchoolCertVisualPlacement {
  if (isValidPlacement(template.stampPlacement)) {
    return clampPlacement(template.stampPlacement)
  }
  return placementFromCmOffsets({
    stampOffsetXCm: template.stampOffsetXCm ?? 0,
    stampOffsetYCm: template.stampOffsetYCm ?? 0,
    signatureOffsetXCm: 0,
    signatureOffsetYCm: 0,
  }).stamp
}

export function resolveSignaturePlacement(
  template: Partial<SchoolCertificateTemplate>,
): SchoolCertVisualPlacement {
  if (isValidPlacement(template.signaturePlacement)) {
    return clampPlacement(template.signaturePlacement)
  }
  return placementFromCmOffsets({
    stampOffsetXCm: 0,
    stampOffsetYCm: 0,
    signatureOffsetXCm: template.signatureOffsetXCm ?? 0,
    signatureOffsetYCm: template.signatureOffsetYCm ?? 0,
  }).signature
}

/** object-contain dans le cadre — coordonnées jsPDF (origine en haut à gauche). */
export function fitImageInSchoolCertBox(
  placement: SchoolCertVisualPlacement,
  pageWidth: number,
  pageHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  const boxW = placement.width * pageWidth
  const boxH = placement.height * pageHeight
  const boxX = placement.x * pageWidth
  const boxY = placement.y * pageHeight
  const scale = Math.min(boxW / imageWidth, boxH / imageHeight)
  const drawW = imageWidth * scale
  const drawH = imageHeight * scale
  return {
    x: boxX + (boxW - drawW) / 2,
    y: boxY + (boxH - drawH) / 2,
    width: drawW,
    height: drawH,
    boxBottom: boxY + boxH,
  }
}
