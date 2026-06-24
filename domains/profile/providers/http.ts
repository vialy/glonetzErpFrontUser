"use client"

import { apiRequest, ApiClientError } from "@/core/api/client"
import { ERROR_CODES } from "@/core/api/error-codes"
import type { StudentClass, StudentMe, StudentProfile } from "@/types"
import type { ProfileProvider } from "@/domains/profile/types"

/** Forme brute d'un utilisateur telle que renvoyee par user.toSafeJSON(). */
type ApiUser = {
  userId?: string
  name?: string
  phone?: string
  email?: string
  hsCp?: boolean
  classId?: string | { classId?: string } | null
  isActive?: boolean
  lastLoginAt?: string
  createdAt?: string
  updatedAt?: string
}

/** Forme brute d'une classe (modele Class). */
type ApiClass = {
  classId?: string
  title?: string
  description?: string
  startDate?: string
  endDate?: string
  fee?: number
  currencyCode?: string
  isActive?: boolean
}

function mapClass(raw: ApiClass | null | undefined): StudentClass | null {
  if (!raw || !raw.classId) return null
  return {
    classId: raw.classId,
    title: raw.title ?? "",
    description: raw.description,
    startDate: raw.startDate,
    endDate: raw.endDate,
    fee: raw.fee ?? 0,
    currencyCode: raw.currencyCode ?? "XAF",
    isActive: raw.isActive ?? true,
  }
}

function resolveClassId(classId: ApiUser["classId"]): string | undefined {
  // Selon l'endpoint, classId est soit l'identifiant (string), soit l'objet
  // classe peuple : on extrait toujours l'identifiant lisible (classId).
  if (typeof classId === "string") return classId || undefined
  if (classId && typeof classId === "object") return classId.classId || undefined
  return undefined
}

function mapProfile(raw: ApiUser): StudentProfile {
  return {
    userId: raw.userId ?? "",
    name: raw.name ?? "",
    phone: raw.phone ?? "",
    email: raw.email,
    hasChangedPassword: raw.hsCp ?? false,
    classId: resolveClassId(raw.classId),
    isActive: raw.isActive ?? true,
    lastLoginAt: raw.lastLoginAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

export const httpProfileProvider: ProfileProvider = {
  async getMe(): Promise<StudentMe> {
    const data = await apiRequest<{ user: ApiUser; class: ApiClass | null }>("/users/me")
    return {
      profile: mapProfile(data.user),
      class: mapClass(data.class),
    }
  },
  async getMyClass(): Promise<StudentClass | null> {
    try {
      const data = await apiRequest<{ class: ApiClass }>("/users/my-class")
      return mapClass(data.class)
    } catch (error) {
      // Aucune classe assignee : le backend renvoie NOT_FOUND, on normalise en null.
      if (error instanceof ApiClientError && error.errorCode === ERROR_CODES.NOT_FOUND) {
        return null
      }
      throw error
    }
  },
}
