"use client"

import { apiRequest, ApiClientError } from "@/core/api/client"
import type {
  ApplyClaimPaymentInput,
  CreatePaymentInput,
  PaymentMethod,
  PaymentStatus,
  PaymentsProvider,
  StudentPaymentRecord,
  StudentTuitionSummary,
} from "@/domains/payments/types"

function extractErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const r = payload as Record<string, unknown>

  const candidate = (r.code ?? r.errorCode ?? r.type ?? r.error ?? r.message ?? r.key) as
    | unknown
    | undefined

  if (typeof candidate === "string" && candidate.trim().length > 0) return candidate
  return undefined
}

function rethrowAsBusinessCode(error: unknown): never {
  if (error instanceof ApiClientError) {
    const code = extractErrorCode(error.payload)
    if (code) throw new Error(code)
  }
  throw error
}

function mapMethodToNeeroProvider(method: CreatePaymentInput["paymentMethod"]) {
  if (method === "orange_money") return "ORANGE_MONEY"
  if (method === "mtn_momo") return "MTN_MONEY"
  return null
}

/** Mappe la methode UI vers le provider attendu par /users/payments/initiate (mtn|orange). */
function mapMethodToGatewayProvider(method: CreatePaymentInput["paymentMethod"]) {
  if (method === "orange_money") return "orange"
  if (method === "mtn_momo") return "mtn"
  return null
}

/** Reponse brute de GET /users/payments/class-summary. */
type ApiClassSummary = {
  class?: { classId?: string; title?: string; fee?: number; currencyCode?: string }
  summary?: {
    expected?: number
    paid?: number
    pending?: number
    remaining?: number
    fullyPaid?: boolean
    currencyCode?: string
    paymentsCount?: number
  }
}

/**
 * Mappe le resume de scolarite backend vers le modele UI.
 * Le nom de l'apprenant n'est pas fourni par cet endpoint : il provient de
 * /users/me (les ecrans completent via useStudentProfile), donc laisse vide ici.
 */
function mapClassSummary(data: ApiClassSummary): StudentTuitionSummary {
  const summary = data.summary ?? {}
  const cls = data.class ?? {}
  const totalTuition = summary.expected ?? cls.fee ?? 0
  const amountPaid = summary.paid ?? 0
  return {
    studentName: "",
    className: cls.title ?? "",
    totalTuition,
    amountPaid,
    remainingAmount: summary.remaining ?? Math.max(0, totalTuition - amountPaid),
    currencyCode: summary.currencyCode ?? cls.currencyCode,
    classId: cls.classId,
  }
}

/** Forme brute d'un paiement (modele Payment) renvoyee par /users/payments. */
type ApiPayment = {
  paymentId?: string
  amount?: number
  currencyCode?: string
  method?: string // "online" | "manual"
  provider?: string // "neero" | "manual" | "none"
  status?: PaymentStatus
  createdAt?: string
  settledAt?: string
  classFriendlyId?: string
  manualNote?: string
}

/** /users/payments renvoie un resultat pagine (mongoose-paginate) ou un tableau. */
type ApiPaymentList = { docs?: ApiPayment[]; totalPages?: number; page?: number } | ApiPayment[]

const PAYMENTS_PAGE_SIZE = 100
const PAYMENTS_MAX_PAGES = 50

/**
 * Mappe la methode backend (online/manual) vers le modele UI (om/mtn/cash).
 * Le backend ne distingue pas Orange/MTN au niveau du paiement (operateur gere
 * par la passerelle), donc un paiement en ligne est approxime en "mtn_momo".
 */
function mapPaymentMethod(method?: string): PaymentMethod {
  if (method === "manual") return "cash"
  return "mtn_momo"
}

function mapPayment(p: ApiPayment): StudentPaymentRecord {
  return {
    paymentId: p.paymentId ?? "",
    amount: p.amount ?? 0,
    currencyCode: p.currencyCode ?? "XAF",
    paymentMethod: mapPaymentMethod(p.method),
    createdAt: p.createdAt ?? new Date().toISOString(),
    paidAt: p.settledAt,
    status: p.status,
    classId: p.classFriendlyId,
    note: p.manualNote,
  }
}

export const httpPaymentsProvider: PaymentsProvider = {
  async getSummary() {
    try {
      const data = await apiRequest<ApiClassSummary>("/users/payments/class-summary", { method: "GET" })
      return mapClassSummary(data)
    } catch (error) {
      rethrowAsBusinessCode(error)
    }
  },
  async getPayments() {
    try {
      // /users/payments est pagine : on parcourt toutes les pages pour ne rien manquer.
      const all: StudentPaymentRecord[] = []
      let pageNum = 1
      for (let i = 0; i < PAYMENTS_MAX_PAGES; i++) {
        const data = await apiRequest<ApiPaymentList>("/users/payments", {
          method: "GET",
          query: { pageNum, pageSize: PAYMENTS_PAGE_SIZE },
        })
        const docs = Array.isArray(data) ? data : (data?.docs ?? [])
        all.push(...docs.map(mapPayment))
        const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1)
        if (docs.length < PAYMENTS_PAGE_SIZE || pageNum >= totalPages) break
        pageNum += 1
      }
      return all
    } catch (error) {
      rethrowAsBusinessCode(error)
    }
  },
  async createPayment(input: CreatePaymentInput) {
    try {
      const neeroBackendUrl = process.env.NEXT_PUBLIC_NEERO_BACKEND_URL
      if (neeroBackendUrl) {
        const provider = mapMethodToNeeroProvider(input.paymentMethod)
        if (!provider) {
          throw new Error("UNSUPPORTED_PAYMENT_METHOD")
        }
        if (!input.phoneNumber?.trim()) {
          throw new Error("PHONE_REQUIRED")
        }

        const response = await fetch(`${neeroBackendUrl}/api/payments/learner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: input.amount,
            phoneNumber: input.phoneNumber.trim(),
            provider,
            countryIso: "CM",
            currencyCode: input.currencyCode ?? "XAF",
            confirm: true,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload?.ok) {
          const candidate = extractErrorCode(payload)
          if (candidate) throw new Error(candidate)
          throw new Error("NEERO_BACKEND_ERROR")
        }

        const intentId = payload?.transactionIntent?.id ?? payload?.transactionIntent?.transactionIntentId
        return {
          paymentId: intentId || `NEERO-${Date.now()}`,
          amount: Number(input.amount),
          currencyCode: input.currencyCode ?? "XAF",
          paymentMethod: input.paymentMethod,
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          note: input.note,
        } satisfies StudentPaymentRecord
      }

      const provider = mapMethodToGatewayProvider(input.paymentMethod)
      if (!provider) {
        throw new Error("UNSUPPORTED_PAYMENT_METHOD")
      }
      if (!input.phoneNumber?.trim()) {
        throw new Error("PHONE_REQUIRED")
      }

      const data = await apiRequest<{ payment: ApiPayment; paymentUrl?: string }>(
        "/users/payments/initiate",
        {
          method: "POST",
          body: {
            amount: input.amount,
            phoneNumber: input.phoneNumber.trim(),
            provider,
            ...(input.classId ? { classId: input.classId } : {}),
          },
        },
      )
      return mapPayment(data.payment)
    } catch (error) {
      rethrowAsBusinessCode(error)
    }
  },
  async applyClaimPayment(input: ApplyClaimPaymentInput) {
    try {
      return await apiRequest<StudentPaymentRecord>("/payments/claims/apply", { method: "POST", body: input as any })
    } catch (error) {
      rethrowAsBusinessCode(error)
    }
  },
}

