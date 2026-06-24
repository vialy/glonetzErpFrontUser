import type { LoginResponse } from "@/types"

export interface LoginInput {
  phone: string
  pin: string
}

export interface ChangePinInput {
  currentPin: string
  newPin: string
}

export interface ResetPinInput {
  phone: string
  tempPin: string
  newPin: string
}

export interface AuthProvider {
  login(input: LoginInput): Promise<LoginResponse>
  changePin(input: ChangePinInput): Promise<void>
  requestPinReset(phone: string): Promise<void>
  resetPinWithCode(input: ResetPinInput): Promise<void>
}

