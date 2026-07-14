"use client"

import { apiRequest } from "@/core/api/client"
import type { CertificatesProvider, TrainingCertificate } from "@/domains/certificates/types"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseTrainingCertificates(data: unknown): TrainingCertificate[] {
  const root = asRecord(data)
  const certificates = root?.certificates
  if (!Array.isArray(certificates)) return []
  return certificates.filter(
    (item): item is TrainingCertificate =>
      Boolean(item && typeof item === "object" && typeof (item as TrainingCertificate).id === "string"),
  )
}

export const httpCertificatesProvider: CertificatesProvider = {
  async getEnrolledLevel() {
    const data = await apiRequest<{ level: string }>("/users/certificates/me/enrolled-level", {
      method: "GET",
    })
    return data.level
  },
  async setEnrolledLevel(level) {
    await apiRequest<void>("/users/certificates/me/enrolled-level", {
      method: "PUT",
      body: { level },
    })
  },
  async getAll() {
    const data = await apiRequest<unknown>("/users/certificates", { method: "GET" })
    return parseTrainingCertificates(data)
  },
  async getForStudent() {
    const data = await apiRequest<unknown>("/users/certificates/me", { method: "GET" })
    return parseTrainingCertificates(data)
  },
  async getById(id) {
    try {
      const data = await apiRequest<{ certificate?: TrainingCertificate }>(
        `/users/certificates/${encodeURIComponent(id)}`,
        { method: "GET" },
      )
      return data.certificate ?? null
    } catch {
      return null
    }
  },
}
