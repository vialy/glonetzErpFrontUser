"use client"

import { httpSchoolCertificatesProvider } from "@/domains/school-certificates/providers/http"
import { mockSchoolCertificatesProvider } from "@/domains/school-certificates/providers/mock"
import type { StudentSchoolCertificateMine } from "@/domains/school-certificates/types"

const provider =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api"
    ? httpSchoolCertificatesProvider
    : mockSchoolCertificatesProvider

export const schoolCertificatesService = {
  getMine(): Promise<StudentSchoolCertificateMine> {
    return provider.getMine()
  },
}
