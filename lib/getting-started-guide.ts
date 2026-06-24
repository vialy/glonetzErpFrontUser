import type { TranslationKey } from "@/services/i18n"

export type GuideStep = {
  id: string
  href: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
}

const STORAGE_KEY = "glonetz_student_getting_started_v1"
const ROLE = "student" as const

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "stu_dashboard",
    href: "/dashboard",
    titleKey: "guide_stu_dash_title",
    descriptionKey: "guide_stu_dash_desc",
  },
  {
    id: "stu_pay",
    href: "/dashboard/effectuer-paiement",
    titleKey: "guide_stu_pay_title",
    descriptionKey: "guide_stu_pay_desc",
  },
  {
    id: "stu_payments",
    href: "/dashboard/mes-paiements",
    titleKey: "guide_stu_payments_title",
    descriptionKey: "guide_stu_payments_desc",
  },
  {
    id: "stu_claims",
    href: "/dashboard/reclamations",
    titleKey: "guide_stu_claims_title",
    descriptionKey: "guide_stu_claims_desc",
  },
  {
    id: "stu_profile",
    href: "/dashboard/mon-profil",
    titleKey: "guide_stu_profile_title",
    descriptionKey: "guide_stu_profile_desc",
  },
]

export function getGuideStepsForRole(): GuideStep[] {
  return GUIDE_STEPS
}

export function isGuideStepVisited(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/"
  const target = href.replace(/\/$/, "") || "/"
  if (target === "/dashboard") return path === "/dashboard"
  return path === target || path.startsWith(`${target}/`)
}

type GuideProgressStore = Partial<Record<typeof ROLE, string[]>>

function readStore(): GuideProgressStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GuideProgressStore) : {}
  } catch {
    return {}
  }
}

function writeStore(store: GuideProgressStore) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new Event("getting-started-updated"))
}

export function getStoredCompletedIds(): string[] {
  return readStore()[ROLE] ?? []
}

export function saveCompletedIds(ids: string[]) {
  const store = readStore()
  store[ROLE] = ids
  writeStore(store)
}

export function resetGuideProgress() {
  const store = readStore()
  delete store[ROLE]
  writeStore(store)
}
