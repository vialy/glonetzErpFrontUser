"use client"

import { DEMO_CLAIM_PROOF_DATA_URL } from "@/lib/claim-proof"

export type ClaimPaymentMethod = "orange_money" | "mtn_momo"
export type ClaimStatus = "en_attente" | "en_cours" | "resolue" | "rejetee"

export interface ClaimRecord {
  id: string
  createdAt: string
  amount: number
  /** Identifiant convivial (PAY-XXXX) du paiement contesté. */
  paymentId?: string
  /** Date du paiement signalé (ISO). */
  paymentDate?: string
  description: string
  screenshotName?: string
  screenshotDataUrl?: string
  status: ClaimStatus
  // Champs hérités (plus saisis) conservés optionnels pour l'affichage legacy.
  paymentMethod?: ClaimPaymentMethod
  phoneNumber?: string
  transactionReference?: string
}

const STORAGE_KEY = "glonetz_claims_v1"

const DEMO_CLAIM: ClaimRecord = {
  id: "CLM-DEMO-001",
  createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  amount: 45_000,
  paymentId: "PAY-DEMO-001",
  paymentDate: new Date(Date.now() - 172_800_000).toISOString(),
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
    paymentId: string
    paymentDate: string
    description?: string
    screenshotFile: File
  }): Promise<ClaimRecord> {
    if (!input.paymentId.trim()) throw new Error("PAYMENT_REQUIRED")
    if (!input.paymentDate) throw new Error("DATE_REQUIRED")
    if (!input.screenshotFile) throw new Error("PROOF_REQUIRED")

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
      // Le montant réel provient du paiement lié (resynchronisé par le back-end v4) :
      // indisponible en mock, donc 0 ici.
      amount: 0,
      paymentId: input.paymentId.trim(),
      paymentDate: input.paymentDate,
      description: input.description?.trim() ?? "",
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

