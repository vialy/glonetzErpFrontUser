import type { LoginResponse, UserRole } from "@/types"
import { PIN_DIGITS_REGEX } from "@/lib/pin"
import { clearAllCached } from "@/lib/client-cache"

export const SESSION_KEY = "glonetz_student_session"
const ATTEMPTS_KEY = "glonetz_student_attempts"
const COOLDOWN_KEY = "glonetz_student_cooldown"
const PIN_RESET_TEMP_KEY = "glonetz_student_pin_reset_temp"
/** Overrides PIN mock — isolé du portail staff (localhost partage le même domaine). */
export const ACCOUNTS_STORAGE_KEY = "glonetz_student_auth_accounts_v2"
const MAX_ATTEMPTS = 3
const COOLDOWN_SECONDS = 30

type AccountOverride = { pin?: string; mustChangePin?: boolean }

// Comptes mock pour les différents rôles
const MOCK_ACCOUNTS: Record<
  string,
  { pin: string; role: UserRole; mustChangePin: boolean }
> = {
  "+237600000001": { pin: "00000000", role: "student", mustChangePin: true },
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readOverrides(): Record<string, AccountOverride> {
  if (typeof localStorage === "undefined") return {}
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, AccountOverride>) : {}
  } catch {
    return {}
  }
}

function writeOverrides(next: Record<string, AccountOverride>) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next))
}

function setAccountOverride(phone: string, patch: AccountOverride) {
  const all = readOverrides()
  all[phone] = { ...all[phone], ...patch }
  writeOverrides(all)
}

function getMergedAccount(phone: string) {
  const base = MOCK_ACCOUNTS[phone]
  if (!base) return null
  const o = readOverrides()[phone]
  return {
    pin: o?.pin ?? base.pin,
    role: base.role,
    mustChangePin: o?.mustChangePin ?? base.mustChangePin,
  }
}

function randomEightDigitPin(): string {
  return String(10_000_000 + Math.floor(Math.random() * 90_000_000))
}

export type ClearAuthBrowserStateOptions = {
  /**
   * `true` (defaut) : supprime aussi les PIN mock persistes (`glonetz_auth_accounts_v2`).
   * `false` : conserve les PIN (ex. apres envoi SMS manager : nouveau PIN deja enregistre, on ne veut que fermer la session).
   */
  clearMockPinOverrides?: boolean
}

/** Déconnexion côté navigateur : cookie de session, compteurs login ; optionnellement les PIN mock. */
export function clearAuthBrowserState(options?: ClearAuthBrowserStateOptions): void {
  const clearPins = options?.clearMockPinOverrides !== false
  // On vide le cache memoire pour ne pas exposer les donnees d'une autre session.
  clearAllCached()
  if (typeof document !== "undefined") {
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ATTEMPTS_KEY)
    sessionStorage.removeItem(COOLDOWN_KEY)
  }
  if (clearPins && typeof localStorage !== "undefined") {
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY)
  }
}

export const AuthService = {
  // ---- Login ----
  async login(phone: string, pin: string): Promise<LoginResponse> {
    await delay(800)

    const account = getMergedAccount(phone)
    if (!account || account.pin !== pin || account.role !== "student") {
      throw new Error("INVALID_CREDENTIALS")
    }

    return {
      token: `mock_token_${Date.now()}`,
      role: account.role,
      mustChangePin: account.mustChangePin,
      phone,
    }
  },

  // ---- Change PIN (première connexion ou après SMS) ----
  async changePin(currentPin: string, newPin: string): Promise<void> {
    await delay(600)
    const session = this.getSession()
    const phone = session?.phone
    if (!phone) throw new Error("PIN_CHANGE_FAILED")

    const acc = getMergedAccount(phone)
    if (!acc || acc.pin !== currentPin) throw new Error("PIN_CHANGE_FAILED")
    if (!PIN_DIGITS_REGEX.test(newPin) || newPin === currentPin) {
      throw new Error("PIN_CHANGE_FAILED")
    }

    setAccountOverride(phone, { pin: newPin, mustChangePin: false })
  },

  // ---- Demande de reset PIN ----
  async requestPinReset(phone: string): Promise<void> {
    await delay(1000)
    const acc = getMergedAccount(phone)
    if (!acc) return

    const tempPin = randomEightDigitPin()
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(
        PIN_RESET_TEMP_KEY,
        JSON.stringify({ phone, tempPin, createdAt: Date.now() }),
      )
    }
    console.info(`[Glonetz SMS mock] Code temporaire pour ${phone}: ${tempPin}`)
  },

  // ---- Reset PIN avec code temporaire ----
  async resetPinWithCode(phone: string, tempPin: string, newPin: string): Promise<void> {
    await delay(800)

    const acc = getMergedAccount(phone)
    if (!acc) throw new Error("PIN_RESET_FAILED")

    if (!PIN_DIGITS_REGEX.test(newPin)) throw new Error("PIN_RESET_FAILED")

    if (newPin === tempPin) throw new Error("PIN_SAME_AS_TEMP")
    if (newPin === acc.pin) throw new Error("PIN_SAME_AS_CURRENT")

    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(PIN_RESET_TEMP_KEY)
      if (!raw) throw new Error("PIN_RESET_INVALID_TEMP")
      try {
        const pending = JSON.parse(raw) as { phone?: string; tempPin?: string }
        if (pending.phone !== phone || pending.tempPin !== tempPin) {
          throw new Error("PIN_RESET_INVALID_TEMP")
        }
      } catch (e) {
        if (e instanceof Error && e.message === "PIN_RESET_INVALID_TEMP") throw e
        throw new Error("PIN_RESET_INVALID_TEMP")
      }
      sessionStorage.removeItem(PIN_RESET_TEMP_KEY)
    }

    setAccountOverride(phone, { pin: newPin, mustChangePin: false })
  },

  // ---- Gestion session (cookies + tentatives) ----
  storeSession(response: LoginResponse) {
    if (typeof window === "undefined") return
    document.cookie = `${SESSION_KEY}=${encodeURIComponent(
      JSON.stringify(response),
    )}; path=/; max-age=86400`
  },

  getSession(): LoginResponse | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(
      new RegExp("(^| )" + SESSION_KEY + "=([^;]+)"),
    )
    if (!match) return null
    try {
      return JSON.parse(decodeURIComponent(match[2])) as LoginResponse
    } catch {
      return null
    }
  },

  clearSession() {
    clearAuthBrowserState()
  },

  getAttempts(): number {
    if (typeof sessionStorage === "undefined") return MAX_ATTEMPTS
    const val = sessionStorage.getItem(ATTEMPTS_KEY)
    return val ? parseInt(val, 10) : MAX_ATTEMPTS
  },

  decrementAttempts(): number {
    const remaining = this.getAttempts() - 1
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(ATTEMPTS_KEY, String(remaining))
    }
    return remaining
  },

  resetAttempts() {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.setItem(ATTEMPTS_KEY, String(MAX_ATTEMPTS))
  },

  setCooldown() {
    const end = Date.now() + COOLDOWN_SECONDS * 1000
    if (typeof sessionStorage === "undefined") return
    sessionStorage.setItem(COOLDOWN_KEY, String(end))
  },

  getCooldownEnd(): number {
    if (typeof sessionStorage === "undefined") return 0
    const val = sessionStorage.getItem(COOLDOWN_KEY)
    return val ? parseInt(val, 10) : 0
  },

  clearCooldown() {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.removeItem(COOLDOWN_KEY)
    this.resetAttempts()
  },

  get maxAttempts() {
    return MAX_ATTEMPTS
  },

  get cooldownSeconds() {
    return COOLDOWN_SECONDS
  },
}
