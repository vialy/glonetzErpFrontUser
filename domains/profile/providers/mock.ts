"use client"

import type { StudentClass, StudentMe } from "@/types"
import type { ProfileProvider } from "@/domains/profile/types"

const mockClass: StudentClass = {
  classId: "CLS-DEMO",
  title: "A1 - Allemand debutant",
  description: "Cours d'allemand niveau A1",
  startDate: "2026-01-15T00:00:00.000Z",
  endDate: "2026-06-15T00:00:00.000Z",
  fee: 300000,
  currencyCode: "XAF",
  isActive: true,
}

const mockMe: StudentMe = {
  profile: {
    userId: "USR-DEMO",
    name: "Etudiant Demo",
    phone: "+237600000001",
    email: undefined,
    hasChangedPassword: true,
    classId: mockClass.classId,
    isActive: true,
    lastLoginAt: new Date().toISOString(),
  },
  class: mockClass,
}

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const mockProfileProvider: ProfileProvider = {
  async getMe() {
    return delay({ ...mockMe })
  },
  async getMyClass() {
    return delay<StudentClass | null>({ ...mockClass })
  },
}
