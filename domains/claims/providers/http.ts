"use client"

import { apiRequest } from "@/core/api/client"
import type { ClaimRecord, ClaimStatus, ClaimsProvider, CreateClaimInput } from "@/domains/claims/types"

/** Forme brute d'une reclamation (modele Claim) renvoyee par /users/claims. */
type ApiClaim = {
  claimId?: string
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

/** Reconstitue une URL absolue pour la preuve (proofUrl peut etre relatif). */
function absoluteUrl(url?: string): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`
}

/**
 * Le back-end n'a pas de colonnes pour l'operateur / numero / reference : on les
 * prefixe a la description pour ne rien perdre cote admin.
 */
function composeDescription(input: CreateClaimInput): string {
  const operator = input.paymentMethod === "orange_money" ? "Orange Money" : "MTN Mobile Money"
  const meta = [`Operateur: ${operator}`]
  if (input.phoneNumber?.trim()) meta.push(`Numero: ${input.phoneNumber.trim()}`)
  if (input.transactionReference?.trim()) meta.push(`Reference: ${input.transactionReference.trim()}`)
  const base = input.description?.trim() ?? ""
  return [meta.join(" | "), base].filter(Boolean).join("\n")
}

function mapClaim(c: ApiClaim): ClaimRecord {
  const proof = absoluteUrl(c.proofUrl)
  return {
    id: c.claimId ?? "",
    createdAt: c.createdAt ?? c.paymentDate ?? new Date().toISOString(),
    amount: c.amount ?? 0,
    // Le backend ne stocke pas l'operateur ni le numero pour une reclamation.
    paymentMethod: "orange_money",
    phoneNumber: "",
    transactionReference: c.claimId ?? "",
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
    // Le backend ne stocke que amount, currencyCode, description, paymentDate + fichier `proof`.
    // L'operateur / numero / reference saisis cote UI n'ont pas de colonne dediee : on les
    // replie dans la description pour qu'ils restent visibles cote admin.
    const body = new FormData()
    body.append("amount", String(input.amount))
    body.append("currencyCode", "XAF")
    body.append("description", composeDescription(input))
    body.append("paymentDate", input.paymentDate || new Date().toISOString())
    if (input.screenshotFile) body.append("proof", input.screenshotFile)
    const data = await apiRequest<{ claim: ApiClaim }>("/users/claims", { method: "POST", body })
    return mapClaim(data.claim)
  },
  async updateStatus(id, status) {
    // Endpoint admin uniquement ; non utilise par le portail apprenant.
    return apiRequest<ClaimRecord>(`/claims/${id}/status`, { method: "PATCH", body: { status } })
  },
}
