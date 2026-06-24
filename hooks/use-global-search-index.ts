"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { buildGlobalSearchIndex, type GlobalSearchItem } from "@/lib/global-search-index"
import { useLocale } from "@/hooks/use-locale"
import type { UserRole } from "@/types"

const REFRESH_EVENTS = ["claims-updated", "student-payments-updated"] as const

export function useGlobalSearchIndex(
  role: UserRole | null,
  phone?: string | null,
): GlobalSearchItem[] {
  const { t } = useLocale()
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (typeof window === "undefined") return
    for (const name of REFRESH_EVENTS) {
      window.addEventListener(name, refresh)
    }
    return () => {
      for (const name of REFRESH_EVENTS) {
        window.removeEventListener(name, refresh)
      }
    }
  }, [refresh])

  return useMemo(() => {
    void tick
    return buildGlobalSearchIndex(null, t, { phone })
  }, [t, phone, tick])
}
