export const CLASS_TIME_SLOTS = ["MO", "MI", "NM", "AB"] as const
export type ClassTimeSlot = (typeof CLASS_TIME_SLOTS)[number]

export const DEFAULT_CLASS_TIME_SLOT: ClassTimeSlot = "MO"

export function isClassTimeSlot(value: string): value is ClassTimeSlot {
  return (CLASS_TIME_SLOTS as readonly string[]).includes(value)
}

export function normalizeStoredClassTimeSlot(timeSlot?: string): ClassTimeSlot {
  if (timeSlot && isClassTimeSlot(timeSlot)) return timeSlot
  return DEFAULT_CLASS_TIME_SLOT
}
