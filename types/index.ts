export type UserRole = "student"

/**
 * Session apprenant persistée dans le cookie `glonetz_student_session`.
 * Le `token` JWT est rejoué par `apiRequest` (header Authorization).
 * Les champs de profil sont renseignés depuis `user.toSafeJSON()` renvoyé par
 * le backend au login, puis rafraîchis via `/users/me`.
 */
export interface LoginResponse {
  token: string
  role: UserRole
  mustChangePin: boolean
  phone?: string
  userId?: string
  name?: string
  email?: string
  classId?: string
}

/** Profil apprenant — projection de `GET /users/me` (`user.toSafeJSON()`). */
export interface StudentProfile {
  userId: string
  name: string
  phone: string
  email?: string
  /** `true` une fois le mot de passe initial changé (backend `hsCp`). */
  hasChangedPassword: boolean
  classId?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt?: string
  updatedAt?: string
}

/** Classe de l'apprenant — projection de `GET /users/my-class` (et de `me.class`). */
export interface StudentClass {
  classId: string
  title: string
  description?: string
  startDate?: string
  endDate?: string
  fee: number
  currencyCode: string
  isActive: boolean
}

/** Réponse agrégée de `GET /users/me` : profil + classe (éventuellement nulle). */
export interface StudentMe {
  profile: StudentProfile
  class: StudentClass | null
}
