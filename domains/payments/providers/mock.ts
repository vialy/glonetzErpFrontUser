"use client"

import { StudentPaymentsService } from "@/services/student-payments.service"
import type { PaymentsProvider } from "@/domains/payments/types"

export const mockPaymentsProvider: PaymentsProvider = {
  async getSummary() {
    return StudentPaymentsService.getSummary()
  },
  async getPayments() {
    return StudentPaymentsService.getPayments()
  },
  async createPayment(input) {
    return StudentPaymentsService.addPayment(input)
  },
  async applyClaimPayment(input) {
    return StudentPaymentsService.applyClaimPayment(input)
  },
  async verifyPayment(paymentId) {
    const payments = await StudentPaymentsService.getPayments()
    const payment = payments.find((p) => p.paymentId === paymentId)
    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND")
    }
    return { payment: { ...payment, status: "successful" }, outcome: "settled" as const }
  },
}

