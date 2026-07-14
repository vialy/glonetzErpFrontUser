"use client"

import { apiRequest } from "@/core/api/client"
import type { Certificate } from "@/domains/certificates/types"
import type { SchoolCertificatesProvider, StudentSchoolCertificateMine } from "@/domains/school-certificates/types"

function parseMine(data: unknown): StudentSchoolCertificateMine {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
  const certificate =
    root.certificate && typeof root.certificate === "object" ? (root.certificate as Certificate) : null
  return {
    certificate,
    tuitionFullyPaid: Boolean(root.tuitionFullyPaid),
    templateReady: Boolean(root.templateReady),
    canDownload: Boolean(root.canDownload),
  }
}

export const httpSchoolCertificatesProvider: SchoolCertificatesProvider = {
  async getMine() {
    const data = await apiRequest<unknown>("/users/school-certificates/me", { method: "GET" })
    return parseMine(data)
  },
}
