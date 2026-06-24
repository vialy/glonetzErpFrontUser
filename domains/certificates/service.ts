"use client"

import { httpCertificatesProvider } from "@/domains/certificates/providers/http"
import { mockCertificatesProvider } from "@/domains/certificates/providers/mock"
import type { TrainingCertificate } from "@/domains/certificates/types"

const provider = (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api" ? httpCertificatesProvider : mockCertificatesProvider

export const certificatesService = {
  getEnrolledLevel(): Promise<string> {
    return provider.getEnrolledLevel()
  },
  setEnrolledLevel(level: string): Promise<void> {
    return provider.setEnrolledLevel(level)
  },
  getAll(): Promise<TrainingCertificate[]> {
    return provider.getAll()
  },
  getForStudent(): Promise<TrainingCertificate[]> {
    return provider.getForStudent()
  },
}

