"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
import { authService } from "@/domains/auth"
import { markWelcomePending } from "@/lib/welcome-session"
import { ApiClientError } from "@/core/api/client"
import { ERROR_CODES } from "@/core/api/error-codes"
import type { UserRole } from "@/types"

/** Traduit l'échec d'un changement de PIN en code d'erreur exploitable par l'UI. */
function mapChangePinError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.errorCode === ERROR_CODES.INVALID_CREDENTIALS) return "WRONG_CURRENT_PIN"
    if (err.errorCode === ERROR_CODES.VALIDATION) return "PIN_TOO_WEAK"
  }
  return "PIN_CHANGE_FAILED"
}

interface UseAuthReturn {
  isAuthenticated: boolean
  role: UserRole | null
  phone: string | null
  name: string | null
  mustChangePin: boolean
  login: (phone: string, pin: string) => Promise<void>
  changePin: (currentPin: string, newPin: string) => Promise<boolean>
  logout: () => void
  loading: boolean
  error: string | null
  attemptsRemaining: number
  cooldownEnd: number
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState(authService.getAttempts())
  const [cooldownEnd, setCooldownEnd] = useState(authService.getCooldownEnd())
  const session = authService.getSession()
  const isAuthenticated = session !== null
  const role = session?.role ?? null
  const phone = session?.phone ?? null
  const name = session?.name ?? null
  const mustChangePin = session?.mustChangePin ?? false

  useEffect(() => {
    const end = authService.getCooldownEnd()
    if (end > Date.now()) {
      setCooldownEnd(end)
    } else if (end > 0) {
      authService.clearCooldown()
      setAttemptsRemaining(authService.maxAttempts)
    }
  }, [])

  const login = useCallback(async (phone: string, pin: string) => {
    setError(null)
    setLoading(true)
    // On repart d'une session vierge : une éventuelle session résiduelle
    // (ex. mustChangePin d'une 1re connexion non finalisée) ne doit pas
    // survivre à une nouvelle tentative (et surtout pas à un échec).
    authService.clearSessionCookie()

    try {
      const response = await authService.login(phone, pin)
      if (response.role !== "student") {
        authService.clearSession()
        throw new Error("INVALID_CREDENTIALS")
      }
      authService.resetAttempts()
      setAttemptsRemaining(authService.maxAttempts)

      if (!response.mustChangePin) {
        markWelcomePending()
        router.push("/dashboard")
      }
    } catch {
      const remaining = authService.decrementAttempts()
      setAttemptsRemaining(remaining)

      if (remaining <= 0) {
        authService.setCooldown()
        const end = authService.getCooldownEnd()
        setCooldownEnd(end)
        setError("TOO_MANY_ATTEMPTS")
      } else {
        setError("INVALID_CREDENTIALS")
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  const changePin = useCallback(async (currentPin: string, newPin: string): Promise<boolean> => {
    setError(null)
    setLoading(true)
    try {
      await authService.changePin(currentPin, newPin)
      authService.clearSession({ clearMockPinOverrides: false })
      router.replace("/login?pinChanged=1")
      router.refresh()
      return true
    } catch (err) {
      setError(mapChangePinError(err))
      return false
    } finally {
      setLoading(false)
    }
  }, [router])

  const logout = useCallback(() => {
    authService.clearSession()
    router.replace("/login")
  }, [router])

  return {
    isAuthenticated,
    role,
    phone,
    name,
    mustChangePin,
    login,
    changePin,
    logout,
    loading,
    error,
    attemptsRemaining,
    cooldownEnd,
  }
}
