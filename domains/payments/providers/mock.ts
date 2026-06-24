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
}

