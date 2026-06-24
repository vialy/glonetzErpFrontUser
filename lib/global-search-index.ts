import { getDashboardNavSections } from "@/components/sidebar-nav"
import { ClaimsService } from "@/services/claims.service"
import type { ClaimRecord, ClaimStatus } from "@/services/claims.service"
import type { TranslationKey } from "@/services/i18n"

export type GlobalSearchGroupId = "pages" | "claims"

export interface GlobalSearchItem {
  id: string
  group: GlobalSearchGroupId
  title: string
  subtitle?: string
  href: string
  keywords: string
}

export type GlobalSearchTranslate = (key: TranslationKey) => string

const GROUP_ORDER: GlobalSearchGroupId[] = ["pages", "claims"]

const GROUP_LABEL_KEYS: Record<GlobalSearchGroupId, TranslationKey> = {
  pages: "global_search_group_pages",
  claims: "global_search_group_claims",
}

function joinKeywords(...parts: (string | number | undefined | null)[]): string {
  return parts
    .filter((p) => p !== undefined && p !== null && String(p).trim() !== "")
    .join(" ")
    .toLowerCase()
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`
}

function claimStatusKey(status: ClaimStatus): TranslationKey {
  switch (status) {
    case "en_attente":
      return "acc_claim_st_pending"
    case "en_cours":
      return "acc_claim_st_progress"
    case "resolue":
      return "acc_claim_st_resolved"
    case "rejetee":
      return "acc_claim_st_rejected"
    default:
      return "acc_claim_st_pending"
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/^\+/, "")
}

function pageItems(t: GlobalSearchTranslate): GlobalSearchItem[] {
  const items: GlobalSearchItem[] = []
  const seen = new Set<string>()

  for (const section of getDashboardNavSections()) {
    for (const nav of section.items) {
      if (nav.isLogout || !nav.href || seen.has(nav.href)) continue
      seen.add(nav.href)
      const title = t(nav.labelKey)
      items.push({
        id: `page:${nav.href}`,
        group: "pages",
        title,
        href: nav.href,
        keywords: joinKeywords(title, nav.href, nav.labelKey),
      })
    }
  }

  const extraHref = "/dashboard/effectuer-paiement"
  if (!seen.has(extraHref)) {
    const title = t("sp_new_payment")
    items.push({
      id: `page:${extraHref}`,
      group: "pages",
      title,
      href: extraHref,
      keywords: joinKeywords(title, extraHref, "sp_new_payment"),
    })
  }

  return items
}

function claimItems(
  claims: ClaimRecord[],
  t: GlobalSearchTranslate,
): GlobalSearchItem[] {
  return claims.map((claim) => ({
    id: `claim:${claim.id}`,
    group: "claims" as const,
    title: claim.id,
    subtitle: [
      formatAmount(claim.amount),
      claim.transactionReference,
      t(claimStatusKey(claim.status)),
    ]
      .filter(Boolean)
      .join(" · "),
    href: "/dashboard/reclamations",
    keywords: joinKeywords(
      claim.id,
      claim.transactionReference,
      claim.phoneNumber,
      claim.description,
      claim.paymentMethod,
      claim.status,
      claim.amount,
    ),
  }))
}

function filterStudentClaims(claims: ClaimRecord[], phone: string | null | undefined): ClaimRecord[] {
  if (!phone?.trim()) return claims
  const key = normalizePhone(phone)
  return claims.filter((c) => normalizePhone(c.phoneNumber) === key)
}

export function buildGlobalSearchIndex(
  _role: null,
  t: GlobalSearchTranslate,
  options?: { phone?: string | null },
): GlobalSearchItem[] {
  const items: GlobalSearchItem[] = [...pageItems(t)]
  const claims = filterStudentClaims(ClaimsService.getAll(), options?.phone)
  items.push(...claimItems(claims, t))
  return items
}

export function groupGlobalSearchItems(
  items: GlobalSearchItem[],
  t: GlobalSearchTranslate,
): { group: GlobalSearchGroupId; label: string; items: GlobalSearchItem[] }[] {
  const buckets = new Map<GlobalSearchGroupId, GlobalSearchItem[]>()
  for (const item of items) {
    const list = buckets.get(item.group) ?? []
    list.push(item)
    buckets.set(item.group, list)
  }
  return GROUP_ORDER.filter((g) => buckets.has(g)).map((group) => ({
    group,
    label: t(GROUP_LABEL_KEYS[group]),
    items: buckets.get(group)!,
  }))
}
