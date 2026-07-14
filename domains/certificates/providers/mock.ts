"use client"

import { CertificatesService } from "@/services/certificates.service"
import type { CertificatesProvider } from "@/domains/certificates/types"

export const mockCertificatesProvider: CertificatesProvider = {
  async getEnrolledLevel() {
    return CertificatesService.getEnrolledLevel()
  },
  async setEnrolledLevel(level) {
    CertificatesService.setEnrolledLevel(level)
  },
  async getAll() {
    return CertificatesService.getAll()
  },
  async getForStudent() {
    return CertificatesService.getForStudent()
  },
  async getById(id) {
    const all = CertificatesService.getForStudent()
    return all.find((certificate) => certificate.id === id) ?? null
  },
}

