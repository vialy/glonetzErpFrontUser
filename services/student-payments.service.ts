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
  classId: string
  totalTuition: number
  payments: StudentPaymentRecord[]
}

const STORAGE_KEY = "glonetz_student_payments_v2"

const DEFAULT_STATE: StudentPaymentState = {
  studentName: "Etudiant Demo",
  className: "A2 - Apr 2025",
  classId: "a2-apr-2025",
  totalTuition: 170_000,
  payments: [
    {
      paymentId: "PAY-DEMO-A1-1",
      amount: 80_000,
      currencyCode: "XOF",
      paymentMethod: "mtn_momo",
      createdAt: "2026-02-10T10:00:00.000Z",
      paidAt: "2026-02-10T10:00:00.000Z",
      classId: "a1-jan-2025",
      status: "successful",
    },
    {
      paymentId: "PAY-DEMO-A1-2",
      amount: 82_000,
      currencyCode: "XOF",
      paymentMethod: "orange_money",
      createdAt: "2026-03-01T14:00:00.000Z",
      paidAt: "2026-03-01T14:00:00.000Z",
      classId: "a1-jan-2025",
      status: "successful",
    },
    {
      paymentId: "PAY-DEMO-A2-1",
      amount: 45_000,
      currencyCode: "XOF",
      paymentMethod: "orange_money",
      createdAt: "2026-03-22T09:00:00.000Z",
      paidAt: "2026-03-22T09:00:00.000Z",
      classId: "a2-apr-2025",
      status: "successful",
    },
  ],
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
      classId: parsed.classId ?? DEFAULT_STATE.classId,
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
      classId: input.classId ?? state.classId,
      status: "successful",
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
      classId: state.classId,
      status: "successful",
    }

    const next: StudentPaymentState = {
      ...state,
      payments: [payment, ...state.payments],
    }
    writeState(next)
    return payment
  },
}

