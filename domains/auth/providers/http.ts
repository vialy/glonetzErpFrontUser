"use client"

import type { LoginResponse } from "@/types"
import { apiRequest } from "@/core/api/client"
import type { AuthProvider, ChangePinInput, LoginInput, ResetPinInput } from "@/domains/auth/types"

type ApiClassRef = string | { classId?: string } | null

type UserLoginData = {
  token: string
  requiresPasswordChange?: boolean
  user?: {
    userId?: string
    name?: string
    email?: string
    phone?: string
    classId?: ApiClassRef
  }
}

function resolveClassId(classId: ApiClassRef | undefined): string | undefined {
  if (typeof classId === "string") return classId || undefined
  if (classId && typeof classId === "object") return classId.classId || undefined
  return undefined
}

export const httpAuthProvider: AuthProvider = {
  async login(input: LoginInput) {
    const data = await apiRequest<UserLoginData>("/users/auth/login", {
      method: "POST",
      body: { emailOrPhone: input.phone, password: input.pin },
    })
    if (!data?.token) throw new Error("INVALID_CREDENTIALS")
    return {
      token: data.token,
      role: "student",
      mustChangePin: data.requiresPasswordChange ?? false,
      phone: data.user?.phone ?? input.phone,
      userId: data.user?.userId,
      name: data.user?.name,
      email: data.user?.email,
      classId: resolveClassId(data.user?.classId),
    } satisfies LoginResponse
  },
  async changePin(input: ChangePinInput) {
    await apiRequest<void>("/users/auth/change-password", {
      method: "POST",
      body: { currentPassword: input.currentPin, newPassword: input.newPin },
    })
  },
  async requestPinReset(phone: string) {
    await apiRequest<void>("/users/auth/request-pin-reset", { method: "POST", body: { phone } })
  },
  async resetPinWithCode(input: ResetPinInput) {
    await apiRequest<void>("/users/auth/reset-pin", { method: "POST", body: input })
  },
}
