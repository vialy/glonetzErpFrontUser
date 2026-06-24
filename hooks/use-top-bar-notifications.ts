"use client"

import { useMemo } from "react"
import { getNotificationDefsForRole } from "@/lib/top-bar-nav"

export function useTopBarNotifications() {
  return useMemo(() => {
    const items = getNotificationDefsForRole()
    return { items, totalBadge: 0, pendingClaims: 0, pendingPayments: 0 }
  }, [])
}
