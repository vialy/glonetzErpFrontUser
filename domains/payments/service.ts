"use client"

import { httpPaymentsProvider } from "@/domains/payments/providers/http"
import { mockPaymentsProvider } from "@/domains/payments/providers/mock"
import type { ApplyClaimPaymentInput, CreatePaymentInput, StudentPaymentRecord, StudentTuitionSummary } from "@/domains/payments/types"

const dataProviderMode = process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock"
const provider = dataProviderMode === "api" ? httpPaymentsProvider : mockPaymentsProvider

export const paymentsService = {
  getSummary(): Promise<StudentTuitionSummary> {
    return provider.getSummary()
  },
  getPayments(): Promise<StudentPaymentRecord[]> {
    return provider.getPayments()
  },
  /**
   * Paiements réclamables (v4) : ceux non validés (pending/failed) sur lesquels
   * l'apprenant peut ouvrir une réclamation. Les paiements sans statut (mock)
   * sont considérés comme payés, donc exclus.
   */
  async getClaimablePayments(): Promise<StudentPaymentRecord[]> {
    const payments = await provider.getPayments()
    return payments.filter((p) => p.status === "pending" || p.status === "failed")
  },
  createPayment(input: CreatePaymentInput): Promise<StudentPaymentRecord> {
    const neeroEnabled = Boolean(process.env.NEXT_PUBLIC_NEERO_BACKEND_URL)
    if (neeroEnabled && (input.paymentMethod === "orange_money" || input.paymentMethod === "mtn_momo")) {
      return httpPaymentsProvider.createPayment(input)
    }
    return provider.createPayment(input)
  },
  applyClaimPayment(input: ApplyClaimPaymentInput): Promise<StudentPaymentRecord> {
    return provider.applyClaimPayment(input)
  },
}

