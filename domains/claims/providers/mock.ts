"use client"

import { ClaimsService } from "@/services/claims.service"
import type { ClaimsProvider } from "@/domains/claims/types"

export const mockClaimsProvider: ClaimsProvider = {
  async getAll() {
    return ClaimsService.getAll()
  },
  async create(input) {
    return ClaimsService.create(input)
  },
  async updateStatus(id, status) {
    return ClaimsService.updateStatus(id, status)
  },
}

