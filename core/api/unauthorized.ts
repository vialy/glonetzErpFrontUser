import { clearAuthBrowserState } from "@/services/auth.service"
import { ERROR_CODES } from "@/core/api/error-codes"

/** Event emis quand la session apprenant expire (token invalide / revoque). */
export const STUDENT_SESSION_EXPIRED_EVENT = "glonetz-student-session-expired"

/**
 * Endpoints d'authentification publics : un echec ici (ex. mauvais identifiants)
 * ne doit jamais etre interprete comme une expiration de session.
 */
const PUBLIC_API_SUFFIXES = [
  "/users/auth/login",
  "/users/auth/request-pin-reset",
  "/users/auth/reset-pin",
]

/**
 * Codes backend traduisant une session reellement invalide -> on deconnecte.
 * INVALID_CREDENTIALS (2001) et PASSWORD_CHANGE_REQUIRED (2002) en sont
 * volontairement exclus : ce sont des signaux de flux, pas des expirations.
 */
const SESSION_INVALID_ERROR_CODES: number[] = [
  ERROR_CODES.UNAUTHORIZED,
  ERROR_CODES.FORBIDDEN,
  ERROR_CODES.INVALID_TOKEN,
  ERROR_CODES.EXPIRED_TOKEN,
]

const SESSION_INVALID_MESSAGES = [
  "unauthorized",
  "unauthenticated",
  "invalid_token",
  "expired_token",
  "missing_token",
]

let handlingUnauthorized = false
let handlingPasswordChange = false

function normalizeApiPath(path: string) {
  const withSlash = path.startsWith("/") ? path : `/${path}`
  return withSlash.startsWith("/api/") ? withSlash : `/api${withSlash}`
}

export function isPublicAuthApiPath(path: string): boolean {
  const normalized = normalizeApiPath(path)
  return PUBLIC_API_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
}

/**
 * Determine si une erreur API correspond a une session invalide/expiree
 * (et non a une erreur metier comme un mauvais mot de passe).
 */
export function isSessionUnauthorizedError(
  path: string,
  options: { status: number; errorCode?: number; message?: string; hadToken: boolean },
): boolean {
  // Une requete sans token n'a pas de session a invalider.
  if (!options.hadToken) return false
  if (isPublicAuthApiPath(path)) return false

  const normalizedPath = normalizeApiPath(path)
  const message = (options.message ?? "").trim().toLowerCase()

  // Mauvais mot de passe actuel lors du change-password -> erreur metier, pas une expiration.
  if (normalizedPath.includes("/users/auth/change-password")) {
    if (options.errorCode === ERROR_CODES.INVALID_CREDENTIALS) return false
    if (message === "invalid_credentials" || message.includes("invalid_credentials")) return false
  }

  // PASSWORD_CHANGE_REQUIRED est un signal de flux : on ne deconnecte pas.
  if (options.errorCode === ERROR_CODES.PASSWORD_CHANGE_REQUIRED) return false

  if (options.status === 401 || options.status === 403) return true
  if (options.errorCode !== undefined && SESSION_INVALID_ERROR_CODES.includes(options.errorCode)) return true
  if (SESSION_INVALID_MESSAGES.some((key) => message === key || message.includes(key))) return true

  return false
}

/**
 * Deconnexion forcee suite a une session invalide : nettoie l'etat navigateur,
 * notifie l'app puis redirige vers le login. Idempotent (anti double-declenchement).
 */
export function handleSessionUnauthorized(): void {
  if (typeof window === "undefined" || handlingUnauthorized) return
  handlingUnauthorized = true

  clearAuthBrowserState({ clearMockPinOverrides: false })
  window.dispatchEvent(new CustomEvent(STUDENT_SESSION_EXPIRED_EVENT))
  window.location.replace("/login?sessionExpired=1")
}

/**
 * Mot de passe regenere par l'admin pendant une session active : ecran dedie
 * avec compte a rebours puis retour au login.
 */
export function handlePasswordChangeRequired(): void {
  if (typeof window === "undefined" || handlingPasswordChange) return
  if (window.location.pathname.startsWith("/session-reset")) return
  handlingPasswordChange = true
  window.location.replace("/session-reset")
}
