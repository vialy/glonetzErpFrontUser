export type PaymentMethod = "orange_money" | "mtn_momo" | "cash"

/** Statuts de paiement renvoyes par le backend (modele Payment). */
export type PaymentStatus = "pending" | "successful" | "failed" | "cancelled" | "refunded"

export interface StudentPaymentRecord {
  paymentId: string
  amount: number
  currencyCode: string
  paymentMethod: PaymentMethod
  createdAt: string
  paidAt?: string
  classId?: string
  userId?: string
  /** Statut backend ; absent pour les donnees mock (traite comme paye). */
  status?: PaymentStatus

  // Champs UI optionnels
  note?: string
  sourceClaimId?: string
}

export interface StudentTuitionSummary {
  studentName: string
  className: string
  totalTuition: number
  amountPaid: number
  remainingAmount: number

  // Champs optionnels (compatibilité avec le schéma backend)
  currencyCode?: string
  classId?: string
  userId?: string
  catalogTuition?: number
  scholarshipDiscount?: number
  isScholarshipHolder?: boolean
  scholarshipIsFull?: boolean
}

export interface CreatePaymentInput {
  amount: number
  paymentMethod: PaymentMethod
  phoneNumber?: string
  note?: string

  // Contexte backend
  classId?: string
  currencyCode?: string // ex: XOF
}

export interface ApplyClaimPaymentInput {
  claimId: string
  amount: number
  paymentMethod: Exclude<PaymentMethod, "cash">
  note?: string
}

export interface PaymentsProvider {
  getSummary(): Promise<StudentTuitionSummary>
  getPayments(): Promise<StudentPaymentRecord[]>
  createPayment(input: CreatePaymentInput): Promise<StudentPaymentRecord>
  applyClaimPayment(input: ApplyClaimPaymentInput): Promise<StudentPaymentRecord>
}

