import type { StudentClass, StudentMe } from "@/types"

/**
 * Contrat d'acces au profil apprenant et a sa classe.
 * Implemente par un provider HTTP (backend reel) et un provider mock.
 */
export interface ProfileProvider {
  /** GET /users/me -> profil + classe (classe nulle si non assignee). */
  getMe(): Promise<StudentMe>
  /** GET /users/my-class -> classe de l'apprenant (null si aucune). */
  getMyClass(): Promise<StudentClass | null>
}
