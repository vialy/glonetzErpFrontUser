"use client"

import { httpClaimsProvider } from "@/domains/claims/providers/http"
import { mockClaimsProvider } from "@/domains/claims/providers/mock"
import type { ClaimRecord, ClaimStatus, CreateClaimInput } from "@/domains/claims/types"

const provider = (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api" ? httpClaimsProvider : mockClaimsProvider

export const claimsService = {
  getAll(): Promise<ClaimRecord[]> {
    return provider.getAll()
  },
  create(input: CreateClaimInput): Promise<ClaimRecord> {
    return provider.create(input)
  },
  updateStatus(id: string, status: ClaimStatus): Promise<ClaimRecord> {
    return provider.updateStatus(id, status)
  },
}

