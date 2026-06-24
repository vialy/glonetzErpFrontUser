/** Cameroon: 9 digits after +237 */
const CM_NATIONAL = /^\+237\d{9}$/

/** Generic E.164 (8–15 digits after country code) */
const E164 = /^\+[1-9]\d{7,14}$/

export function validatePhoneE164(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, "")
  if (!normalized.startsWith("+")) return false

  if (normalized.startsWith("+237")) {
    return CM_NATIONAL.test(normalized)
  }

  return E164.test(normalized)
}

export function formatPhoneE164(phone: string): string {
  return phone.replace(/[\s-]/g, "")
}
