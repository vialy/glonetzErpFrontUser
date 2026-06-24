"use client"

import { apiRequest } from "@/core/api/client"
import type { CertificatesProvider, TrainingCertificate } from "@/domains/certificates/types"

export const httpCertificatesProvider: CertificatesProvider = {
  async getEnrolledLevel() {
    const payload = await apiRequest<{ level: string }>("/certificates/me/enrolled-level", { method: "GET" })
    return payload.level
  },
  async setEnrolledLevel(level) {
    await apiRequest<void>("/certificates/me/enrolled-level", { method: "PUT", body: { level } })
  },
  async getAll() {
    return apiRequest<TrainingCertificate[]>("/certificates", { method: "GET" })
  },
  async getForStudent() {
    return apiRequest<TrainingCertificate[]>("/certificates/me", { method: "GET" })
  },
}

