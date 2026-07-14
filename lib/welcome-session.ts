/** Set on fresh login; consumed once by the dashboard welcome overlay. */
export const SHOW_WELCOME_KEY = "glonetz_student_show_welcome"

export function markWelcomePending() {
  if (typeof window === "undefined") return
  sessionStorage.setItem(SHOW_WELCOME_KEY, "1")
}

export function consumeWelcomePending(): boolean {
  if (typeof window === "undefined") return false
  if (sessionStorage.getItem(SHOW_WELCOME_KEY) !== "1") return false
  sessionStorage.removeItem(SHOW_WELCOME_KEY)
  return true
}

export function displayFirstName(fullName: string | null | undefined, fallback: string): string {
  if (!fullName?.trim()) return fallback
  return fullName.trim().split(/\s+/)[0] ?? fullName
}
