"use client"

import type { StudentClass, StudentMe } from "@/types"
import { httpProfileProvider } from "@/domains/profile/providers/http"
import { mockProfileProvider } from "@/domains/profile/providers/mock"

const provider =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api" ? httpProfileProvider : mockProfileProvider

export const profileService = {
  /** Profil apprenant courant + classe (GET /users/me). */
  getMe(): Promise<StudentMe> {
    return provider.getMe()
  },
  /** Classe de l'apprenant courant (GET /users/my-class), null si non assignee. */
  getMyClass(): Promise<StudentClass | null> {
    return provider.getMyClass()
  },
}
