"use client"

import { DEMO_CLAIM_PROOF_DATA_URL } from "@/lib/claim-proof"

export type ClaimPaymentMethod = "orange_money" | "mtn_momo"
export type ClaimStatus = "en_attente" | "en_cours" | "resolue" | "rejetee"

export interface ClaimRecord {
  id: string
  createdAt: string
  amount: number
  paymentMethod: ClaimPaymentMethod
  phoneNumber: string
  transactionReference: string
  description: string
  screenshotName?: string
  screenshotDataUrl?: string
  status: ClaimStatus
}

const STORAGE_KEY = "glonetz_claims_v1"

const DEMO_CLAIM: ClaimRecord = {
  id: "CLM-DEMO-001",
  createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  amount: 45_000,
  paymentMethod: "mtn_momo",
  phoneNumber: "+237677100099",
  transactionReference: "MTN-DEMO-REF-001",
  description: "Exemple : paiement debite non visible — preuve jointe pour test admin.",
  screenshotName: "preuve-demo.png",
  screenshotDataUrl: DEMO_CLAIM_PROOF_DATA_URL,
  status: "en_attente",
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readClaims(): ClaimRecord[] {
  if (!canUseStorage()) return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveClaims(claims: ClaimRecord[]) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims))
  window.dispatchEvent(new Event("claims-updated"))
}

export const ClaimsService = {
  getAll(): ClaimRecord[] {
    const list = readClaims()
    const sorted = list.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    if (sorted.length > 0) return sorted
    return [DEMO_CLAIM]
  },

  async create(input: {
    amount: number
    paymentMethod: ClaimPaymentMethod
    phoneNumber: string
    transactionReference: string
    description: string
    screenshotFile?: File | null
  }): Promise<ClaimRecord> {
    if (input.amount <= 0) throw new Error("INVALID_AMOUNT")
    if (!input.phoneNumber.trim()) throw new Error("PHONE_REQUIRED")
    if (!input.transactionReference.trim()) throw new Error("REFERENCE_REQUIRED")
    if (!input.description.trim()) throw new Error("DESCRIPTION_REQUIRED")

    let screenshotDataUrl: string | undefined
    let screenshotName: string | undefined

    if (input.screenshotFile) {
      screenshotName = input.screenshotFile.name
      screenshotDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("SCREENSHOT_READ_FAILED"))
        reader.readAsDataURL(input.screenshotFile as Blob)
      })
    }

    const claim: ClaimRecord = {
      id: `CLM-${Date.now()}`,
      createdAt: new Date().toISOString(),
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      phoneNumber: input.phoneNumber.trim(),
      transactionReference: input.transactionReference.trim(),
      description: input.description.trim(),
      screenshotName,
      screenshotDataUrl,
      status: "en_attente",
    }

    const claims = readClaims()
    saveClaims([claim, ...claims])
    return claim
  },

  updateStatus(id: string, status: ClaimStatus): ClaimRecord {
    const claims = readClaims()
    const index = claims.findIndex((claim) => claim.id === id)
    if (index === -1) throw new Error("CLAIM_NOT_FOUND")

    const updated: ClaimRecord = {
      ...claims[index],
      status,
    }
    const nextClaims = [...claims]
    nextClaims[index] = updated
    saveClaims(nextClaims)
    return updated
  },
}

