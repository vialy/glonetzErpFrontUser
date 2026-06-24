"use client"

import { useCallback, useEffect, useState } from "react"
import { profileService } from "@/domains/profile"
import { CACHE_KEYS, getCached, hasCached, setCached } from "@/lib/client-cache"
import type { StudentClass, StudentProfile } from "@/types"

interface UseStudentProfileReturn {
  profile: StudentProfile | null
  studentClass: StudentClass | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

type CachedProfile = { profile: StudentProfile | null; class: StudentClass | null }

/**
 * Charge le profil apprenant et sa classe depuis /users/me.
 * Un token invalide/expire declenche la deconnexion automatique via apiRequest.
 */
export function useStudentProfile(): UseStudentProfileReturn {
  const cached = getCached<CachedProfile>(CACHE_KEYS.profileMe)
  const [profile, setProfile] = useState<StudentProfile | null>(cached?.profile ?? null)
  const [studentClass, setStudentClass] = useState<StudentClass | null>(cached?.class ?? null)
  // Skeleton uniquement si rien n'est encore en cache.
  const [loading, setLoading] = useState(() => !hasCached(CACHE_KEYS.profileMe))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    // Revalidation silencieuse si on a deja des donnees en cache.
    if (!hasCached(CACHE_KEYS.profileMe)) setLoading(true)
    setError(null)
    try {
      const { profile: nextProfile, class: nextClass } = await profileService.getMe()
      setProfile(nextProfile)
      setStudentClass(nextClass)
      setCached<CachedProfile>(CACHE_KEYS.profileMe, { profile: nextProfile, class: nextClass })
    } catch (e) {
      setError(e instanceof Error ? e.message : "PROFILE_LOAD_FAILED")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { profile, studentClass, loading, error, refresh }
}
