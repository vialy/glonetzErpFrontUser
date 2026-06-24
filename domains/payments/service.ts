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

