"use client"

import { apiRequest, ApiClientError } from "@/core/api/client"
import type { ClaimRecord, ClaimStatus, ClaimsProvider, CreateClaimInput } from "@/domains/claims/types"

// Codes d'erreur backend (envelope.errorCode) utiles cote reclamations.
const ERR_CONFLICT = 1005 // doublon : une reclamation existe deja pour ce paiement
const ERR_PAYMENT_NOT_FOUND = 3004

/** Forme brute d'une reclamation (modele Claim) renvoyee par /users/claims. */
type ApiClaim = {
  claimId?: string
  paymentId?: string
  amount?: number
  currencyCode?: string
  description?: string
  paymentDate?: string
  proofUrl?: string
  status?: "pending" | "successful" | "failed"
  createdAt?: string
}

/** /users/claims renvoie un resultat pagine (mongoose-paginate) ou un tableau. */
type ApiClaimList = { docs?: ApiClaim[] } | ApiClaim[]

function mapStatus(status?: string): ClaimStatus {
  if (status === "successful") return "resolue"
  if (status === "failed") return "rejetee"
  return "en_attente" // pending ou inconnu
}

/**
 * Reconstruit l'URL de la preuve sur l'API réellement utilisée.
 * Le back-end génère proofUrl avec son APP_BASE_URL (souvent http://localhost:4000
 * en dev) : on ré-ancre toujours le chemin du fichier sur NEXT_PUBLIC_API_BASE_URL
 * pour que l'image se charge depuis le bon hôte (les uploads sont servis par l'API).
 */
function absoluteUrl(url?: string): string | undefined {
  if (!url) return undefined
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
  if (!base) return url
  try {
    const parsed = new URL(url)
    return `${base}${parsed.pathname}${parsed.search}`
  } catch {
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`
  }
}

function mapClaim(c: ApiClaim): ClaimRecord {
  const proof = absoluteUrl(c.proofUrl)
  return {
    id: c.claimId ?? "",
    createdAt: c.createdAt ?? c.paymentDate ?? new Date().toISOString(),
    amount: c.amount ?? 0,
    // Identifiant convivial du paiement contesté (renvoyé par le back-end v4).
    paymentId: c.paymentId,
    paymentDate: c.paymentDate,
    description: c.description ?? "",
    screenshotDataUrl: proof,
    screenshotName: proof ? proof.split("/").pop() : undefined,
    status: mapStatus(c.status),
  }
}

export const httpClaimsProvider: ClaimsProvider = {
  async getAll() {
    const data = await apiRequest<ApiClaimList>("/users/claims", { method: "GET" })
    const docs = Array.isArray(data) ? data : (data?.docs ?? [])
    return docs.map(mapClaim)
  },
  async create(input: CreateClaimInput) {
    // v4 : une réclamation est rattachée à un paiement existant (pending/failed).
    // Le montant est recopié du paiement côté back-end : on n'envoie que
    // paymentId, paymentDate, description et le fichier `proof`.
    const body = new FormData()
    body.append("paymentId", input.paymentId)
    body.append("paymentDate", input.paymentDate || new Date().toISOString())
    if (input.description?.trim()) body.append("description", input.description.trim())
    if (input.screenshotFile) body.append("proof", input.screenshotFile)
    try {
      const data = await apiRequest<{ claim: ApiClaim }>("/users/claims", { method: "POST", body })
      return mapClaim(data.claim)
    } catch (error) {
      // Traduit les codes back-end en codes metier stables pour l'UI.
      if (error instanceof ApiClientError) {
        if (error.errorCode === ERR_CONFLICT) throw new Error("CLAIM_ALREADY_EXISTS")
        if (error.errorCode === ERR_PAYMENT_NOT_FOUND) throw new Error("PAYMENT_NOT_FOUND")
      }
      throw error
    }
  },
  async updateStatus(id, status) {
    // Endpoint admin uniquement ; non utilise par le portail apprenant.
    return apiRequest<ClaimRecord>(`/claims/${id}/status`, { method: "PATCH", body: { status } })
  },
}
