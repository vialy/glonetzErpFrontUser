"use client"

import type { StudentClass, StudentMe } from "@/types"
import type { ProfileProvider } from "@/domains/profile/types"

const mockClass: StudentClass = {
  classId: "a2-apr-2025",
  title: "A2 - Apr 2025",
  description: "Cours d'allemand niveau A2",
  startDate: "2025-04-01T00:00:00.000Z",
  endDate: "2025-09-30T00:00:00.000Z",
  fee: 170_000,
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
