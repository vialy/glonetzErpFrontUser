"use client"

import { AuthService } from "@/services/auth.service"
import type { AuthProvider } from "@/domains/auth/types"

export const mockAuthProvider: AuthProvider = {
  async login(input) {
    return AuthService.login(input.phone, input.pin)
  },
  async changePin(input) {
    return AuthService.changePin(input.currentPin, input.newPin)
  },
  async requestPinReset(phone) {
    return AuthService.requestPinReset(phone)
  },
  async resetPinWithCode(input) {
    return AuthService.resetPinWithCode(input.phone, input.tempPin, input.newPin)
  },
}

