export type ClaimPaymentMethod = "orange_money" | "mtn_momo"
export type ClaimStatus = "en_attente" | "en_cours" | "resolue" | "rejetee"

export interface ClaimRecord {
  id: string
  createdAt: string
  amount: number
  /** Identifiant convivial (PAY-XXXX) du paiement contesté. */
  paymentId?: string
  description: string
  /** Date du paiement signalé (ISO). */
  paymentDate?: string
  screenshotName?: string
  screenshotDataUrl?: string
  status: ClaimStatus
  // Champs hérités (plus saisis) conservés optionnels pour l'affichage legacy.
  paymentMethod?: ClaimPaymentMethod
  phoneNumber?: string
  transactionReference?: string
}

export interface CreateClaimInput {
  /** Paiement contesté (pending/failed) sélectionné par l'apprenant. */
  paymentId: string
  /** Date du paiement signalé (ISO). Requis par le back-end. */
  paymentDate: string
  description?: string
  screenshotFile: File
}

export interface ClaimsProvider {
  getAll(): Promise<ClaimRecord[]>
  create(input: CreateClaimInput): Promise<ClaimRecord>
  updateStatus(id: string, status: ClaimStatus): Promise<ClaimRecord>
}
