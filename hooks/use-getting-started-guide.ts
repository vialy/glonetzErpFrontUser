"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import {
  getGuideStepsForRole,
  getStoredCompletedIds,
  isGuideStepVisited,
  saveCompletedIds,
  resetGuideProgress,
  type GuideStep,
} from "@/lib/getting-started-guide"
import type { UserRole } from "@/types"

export function useGettingStartedGuide(_role?: UserRole | null) {
  const pathname = usePathname()
  const steps = useMemo(() => getGuideStepsForRole(), [])
  const [completedIds, setCompletedIds] = useState<string[]>([])

  const syncFromStorage = useCallback(() => {
    setCompletedIds(getStoredCompletedIds())
  }, [])

  useEffect(() => {
    syncFromStorage()
    window.addEventListener("getting-started-updated", syncFromStorage)
    return () => window.removeEventListener("getting-started-updated", syncFromStorage)
  }, [syncFromStorage])

  useEffect(() => {
    if (steps.length === 0) return
    const visited = steps.filter((step) => isGuideStepVisited(pathname, step.href)).map((s) => s.id)
    if (visited.length === 0) return

    setCompletedIds((prev) => {
      const merged = new Set([...prev, ...visited])
      const next = [...merged]
      saveCompletedIds(next)
      return next
    })
  }, [pathname, steps])

  const completedCount = useMemo(
    () => steps.filter((s) => completedIds.includes(s.id)).length,
    [steps, completedIds],
  )

  const total = steps.length
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const isComplete = total > 0 && completedCount >= total

  const isStepDone = useCallback((stepId: string) => completedIds.includes(stepId), [completedIds])

  const currentStep = useMemo(
    () => steps.find((s) => isGuideStepVisited(pathname, s.href)),
    [steps, pathname],
  )

  function reset() {
    resetGuideProgress()
    setCompletedIds([])
  }

  return {
    steps,
    completedIds,
    completedCount,
    total,
    progressPercent,
    isComplete,
    isStepDone,
    currentStep,
    reset,
  }
}

export type GettingStartedGuideState = ReturnType<typeof useGettingStartedGuide>
