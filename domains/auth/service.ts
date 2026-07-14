"use client"

import type { LoginResponse } from "@/types"
import { clearAuthBrowserState, SESSION_KEY, type ClearAuthBrowserStateOptions } from "@/services/auth.service"
import { httpAuthProvider } from "@/domains/auth/providers/http"
import { mockAuthProvider } from "@/domains/auth/providers/mock"
import { profileService } from "@/domains/profile"

const ATTEMPTS_KEY = "glonetz_student_attempts"
const COOLDOWN_KEY = "glonetz_student_cooldown"
const MAX_ATTEMPTS = 3
const COOLDOWN_SECONDS = 30

const provider = (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api" ? httpAuthProvider : mockAuthProvider

export const authService = {
  async login(phone: string, pin: string): Promise<LoginResponse> {
    const response = await provider.login({ phone, pin })
    this.storeSession(response)
    return response
  },
  async changePin(currentPin: string, newPin: string): Promise<void> {
    await provider.changePin({ currentPin, newPin })
    const session = this.getSession()
    if (session) this.storeSession({ ...session, mustChangePin: false })
  },
  /**
   * Revalide le token courant et rafraîchit la session avec les données fraîches
   * de `/users/me`. En cas de token invalide/expiré, `apiRequest` déclenche la
   * déconnexion automatique. Retourne la session mise à jour (ou l'actuelle).
   */
  async refreshSession(): Promise<LoginResponse | null> {
    const session = this.getSession()
    if (!session) return null
    try {
      const { profile } = await profileService.getMe()
      const next: LoginResponse = {
        ...session,
        phone: profile.phone || session.phone,
        userId: profile.userId || session.userId,
        name: profile.name || session.name,
        email: profile.email ?? session.email,
        classId: profile.classId ?? session.classId,
        mustChangePin: !profile.hasChangedPassword,
      }
      this.storeSession(next)
      return next
    } catch {
      return this.getSession()
    }
  },
  async requestPinReset(phone: string): Promise<void> {
    await provider.requestPinReset(phone)
  },
  async resetPinWithCode(phone: string, tempPin: string, newPin: string): Promise<void> {
    await provider.resetPinWithCode({ phone, tempPin, newPin })
  },
  storeSession(response: LoginResponse) {
    if (typeof window === "undefined") return
    document.cookie = `${SESSION_KEY}=${encodeURIComponent(JSON.stringify(response))}; path=/; max-age=86400`
  },
  getSession(): LoginResponse | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp(`(^| )${SESSION_KEY}=([^;]+)`))
    if (!match) return null
    try {
      return JSON.parse(decodeURIComponent(match[2]))
    } catch {
      return null
    }
  },
  /** Déconnexion : nettoie session + anti-brute + par defaut les PIN mock (tous roles). Voir options pour cas particuliers. */
  clearSession(options?: ClearAuthBrowserStateOptions) {
    clearAuthBrowserState(options)
  },
  /**
   * Supprime UNIQUEMENT le cookie de session (sans toucher au compteur de
   * tentatives ni au cooldown). Utilisé au début d'une connexion pour repartir
   * d'un état propre et éviter qu'une session résiduelle (ex. mustChangePin)
   * ne pollue le formulaire de login.
   */
  clearSessionCookie() {
    if (typeof document === "undefined") return
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
  },
  isAuthenticated(): boolean {
    return this.getSession() !== null
  },
  getAttempts(): number {
    if (typeof sessionStorage === "undefined") return MAX_ATTEMPTS
    const val = sessionStorage.getItem(ATTEMPTS_KEY)
    return val ? parseInt(val, 10) : MAX_ATTEMPTS
  },
  decrementAttempts(): number {
    const remaining = this.getAttempts() - 1
    sessionStorage.setItem(ATTEMPTS_KEY, String(remaining))
    return remaining
  },
  resetAttempts() {
    sessionStorage.setItem(ATTEMPTS_KEY, String(MAX_ATTEMPTS))
  },
  setCooldown() {
    const end = Date.now() + COOLDOWN_SECONDS * 1000
    sessionStorage.setItem(COOLDOWN_KEY, String(end))
  },
  getCooldownEnd(): number {
    if (typeof sessionStorage === "undefined") return 0
    const val = sessionStorage.getItem(COOLDOWN_KEY)
    return val ? parseInt(val, 10) : 0
  },
  clearCooldown() {
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

