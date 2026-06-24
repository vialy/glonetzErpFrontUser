"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
import { authService } from "@/domains/auth"
import type { UserRole } from "@/types"

interface UseAuthReturn {
  isAuthenticated: boolean
  role: UserRole | null
  phone: string | null
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

    try {
      const response = await authService.login(phone, pin)
      if (response.role !== "student") {
        authService.clearSession()
        throw new Error("INVALID_CREDENTIALS")
      }
      authService.resetAttempts()
      setAttemptsRemaining(authService.maxAttempts)

      if (!response.mustChangePin) {
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
    } catch {
      setError("PIN_CHANGE_FAILED")
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
