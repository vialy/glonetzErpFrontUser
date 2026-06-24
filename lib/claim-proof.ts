/** Petite image PNG 1x1 pour demo / tests si preuve manquante en base. */
export const DEMO_CLAIM_PROOF_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const trimmed = dataUrl.trim()
  if (!trimmed.startsWith("data:")) return null

  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i.exec(trimmed)
  if (!match) return null

  const mime = match[1] || "application/octet-stream"
  const isBase64 = Boolean(match[2])
  const payload = match[3] ?? ""

  try {
    if (isBase64) {
      const binary = atob(payload)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      return { mime, bytes }
    }
    const decoded = decodeURIComponent(payload)
    const bytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i)
    return { mime, bytes }
  } catch {
    return null
  }
}

function toBlob(dataUrl: string): Blob | null {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return null
  return new Blob([parsed.bytes], { type: parsed.mime })
}

export function isClaimProofReadable(dataUrl?: string): boolean {
  if (!dataUrl?.trim()) return false
  return Boolean(parseDataUrl(dataUrl) ?? dataUrl.trim().startsWith("data:"))
}

export function defaultClaimProofFilename(claimId: string, screenshotName?: string): string {
  const fromName = screenshotName?.trim()
  if (fromName) return fromName
  const safeId = claimId.replace(/[^\w.-]+/g, "_")
  return `preuve-reclamation-${safeId}.png`
}

/** URL objet pour affichage dans <img> ou nouvel onglet (a revoquer avec revokeProofUrl). */
export function proofToObjectUrl(dataUrl: string): string | null {
  const blob = toBlob(dataUrl)
  if (blob) return URL.createObjectURL(blob)
  if (dataUrl.trim().startsWith("data:")) return dataUrl.trim()
  return null
}

export function revokeProofUrl(objectUrl: string | null) {
  if (objectUrl?.startsWith("blob:")) URL.revokeObjectURL(objectUrl)
}

export function openClaimProof(dataUrl: string, filename: string): void {
  const objectUrl = proofToObjectUrl(dataUrl)
  if (!objectUrl) {
    downloadClaimProof(dataUrl, filename)
    return
  }
  const opened = window.open(objectUrl, "_blank", "noopener,noreferrer")
  if (!opened) return
  if (objectUrl.startsWith("blob:")) {
    window.setTimeout(() => revokeProofUrl(objectUrl), 120_000)
  }
}

export function downloadClaimProof(dataUrl: string, filename: string): void {
  const safeName = filename.trim() || "preuve-reclamation.png"
  const blob = toBlob(dataUrl)

  if (blob) {
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = safeName
    anchor.rel = "noopener"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    return
  }

  const anchor = document.createElement("a")
  anchor.href = dataUrl
  anchor.download = safeName
  anchor.rel = "noopener"
  anchor.target = "_blank"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
