import type { TranslationKey } from "@/services/i18n"

export function getProfileHref(): string {
  return "/dashboard/mon-profil"
}

export type TopBarNotificationDef = {
  id: string
  href: string
  labelKey: TranslationKey
  count: number
}

export function getNotificationDefsForRole(): TopBarNotificationDef[] {
  return []
}
