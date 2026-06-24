/**
 * Texte pour jsPDF (Helvetica standard) : évite les caractères Unicode peu supportés
 * (ex. espace insécable étroit U+202F utilisé par Intl en fr-FR), qui corrompent l'affichage.
 */
const UNICODE_SPACE_LIKE = /[\u202f\u00a0\u2009\u2007\u2028]/g

export function sanitizeTextForPdf(input: string): string {
  return input.replace(UNICODE_SPACE_LIKE, " ")
}

/** Montant lisible en PDF : chiffres + espaces ASCII uniquement. */
export function formatFcfaForPdf(value: number): string {
  const n = Math.round(Number.isFinite(value) ? value : 0)
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  const grouped = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${sign}${grouped} F CFA`
}
