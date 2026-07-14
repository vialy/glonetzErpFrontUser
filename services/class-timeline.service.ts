"use client"

import { apiRequest } from "@/core/api/client"
import type { LearnerClassTimelineResponse } from "@/lib/learner-class-timeline"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseTimelineResponse(data: unknown): LearnerClassTimelineResponse {
  const root = asRecord(data) ?? {}
  const nested = asRecord(root.data) ?? root
  const entries = Array.isArray(nested.entries) ? nested.entries : []
  return {
    entries: entries as LearnerClassTimelineResponse["entries"],
    totalPaid: Number(nested.totalPaid) || 0,
    currentClassId:
      typeof nested.currentClassId === "string" ? nested.currentClassId : undefined,
  }
}

export async function fetchMyClassTimeline(): Promise<LearnerClassTimelineResponse> {
  const data = await apiRequest<unknown>("/users/my-class-timeline", { method: "GET" })
  return parseTimelineResponse(data)
}
