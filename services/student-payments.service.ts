"use client"

import type {
  ApplyClaimPaymentInput,
  CreatePaymentInput,
  StudentPaymentRecord,
  StudentTuitionSummary,
} from "@/domains/payments/types"

type StudentPaymentState = {
  studentName: string
  className: string
  totalTuition: number
  payments: StudentPaymentRecord[]
}

const STORAGE_KEY = "glonetz_student_payments_v1"

const DEFAULT_STATE: StudentPaymentState = {
  studentName: "Etudiant Demo",
  className: "A1",
  totalTuition: 160_000,
  payments: [],
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readState(): StudentPaymentState {
  if (!canUseStorage()) return DEFAULT_STATE
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE))
    return DEFAULT_STATE
  }
  try {
    const parsed = JSON.parse(raw) as StudentPaymentState
    return {
      studentName: parsed.studentName ?? DEFAULT_STATE.studentName,
      className: parsed.className ?? DEFAULT_STATE.className,
      totalTuition: parsed.totalTuition ?? DEFAULT_STATE.totalTuition,
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    }
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE))
    return DEFAULT_STATE
  }
}

function writeState(state: StudentPaymentState) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event("student-payments-updated"))
}

function getAmountPaid(payments: StudentPaymentRecord[]) {
  return payments.reduce((sum, payment) => sum + payment.amount, 0)
}

export const StudentPaymentsService = {
  getSummary(): StudentTuitionSummary {
    const state = readState()
    const amountPaid = getAmountPaid(state.payments)
    const remainingAmount = Math.max(state.totalTuition - amountPaid, 0)

    return {
      studentName: state.studentName,
      className: state.className,
      totalTuition: state.totalTuition,
      amountPaid,
      remainingAmount,
      currencyCode: "XOF",
    }
  },

  getPayments(): StudentPaymentRecord[] {
    const state = readState()
    return [...state.payments].sort((a, b) =>
      (a.paidAt ?? a.createdAt) < (b.paidAt ?? b.createdAt) ? 1 : -1,
    )
  },

  addPayment(input: CreatePaymentInput): StudentPaymentRecord {
    const state = readState()
    const amountPaid = getAmountPaid(state.payments)
    const remaining = state.totalTuition - amountPaid

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("INVALID_AMOUNT")
    }

    if (input.amount > remaining + 0.01) {
      throw new Error("AMOUNT_EXCEEDS_REMAINING")
    }

    const payment: StudentPaymentRecord = {
      paymentId: `PAY-${Date.now()}`,
      amount: input.amount,
      currencyCode: "XOF",
      paymentMethod: input.paymentMethod,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      note: input.note,
    }

    const next: StudentPaymentState = {
      ...state,
      payments: [payment, ...state.payments],
    }
    writeState(next)
    return payment
  },

  applyClaimPayment(input: ApplyClaimPaymentInput): StudentPaymentRecord {
    // Ici on traite la réclamation comme un paiement normal,
    // en mémorisant simplement l'id de réclamation.
    const state = readState()
    const amountPaid = getAmountPaid(state.payments)
    const remaining = state.totalTuition - amountPaid

    if (input.amount > remaining + 0.01) {
      throw new Error("AMOUNT_EXCEEDS_REMAINING")
    }

    const payment: StudentPaymentRecord = {
      paymentId: `PAY-CLM-${Date.now()}`,
      amount: input.amount,
      currencyCode: "XOF",
      paymentMethod: input.paymentMethod,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      note: input.note,
      sourceClaimId: input.claimId,
    }

    const next: StudentPaymentState = {
      ...state,
      payments: [payment, ...state.payments],
    }
    writeState(next)
    return payment
  },
}

