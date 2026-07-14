"use client"

import { apiRequest } from "@/core/api/client"
import {
  resolveSignaturePlacement,
  resolveStampPlacement,
  type SchoolCertVisualPlacement,
} from "@/lib/school-cert-placement"

/**
 * Modèle global du certificat de scolarité — textes éditables par l'admin.
 * Texte par défaut extrait du modèle MAIVA (`public/templates/maiva-reference.pdf`).
 */

export interface SchoolCertificateTemplateSection {
  id: string
  title: string
  content: string
}

export interface SchoolCertificateTemplate {
  documentTitle: string
  sections: SchoolCertificateTemplateSection[]
  /** Position visuelle du cachet sur la page (0–1). Prioritaire sur les décalages cm. */
  stampPlacement?: import("@/lib/school-cert-placement").SchoolCertVisualPlacement
  /** Position visuelle de la signature sur la page (0–1). */
  signaturePlacement?: import("@/lib/school-cert-placement").SchoolCertVisualPlacement
  /** @deprecated Conservé pour migration — préférer stampPlacement. */
  stampOffsetXCm: number
  /** @deprecated Conservé pour migration — préférer stampPlacement. */
  stampOffsetYCm: number
  /** @deprecated Conservé pour migration — préférer signaturePlacement. */
  signatureOffsetXCm: number
  /** @deprecated Conservé pour migration — préférer signaturePlacement. */
  signatureOffsetYCm: number
  stampApproved: boolean
  signatureApproved: boolean
  stampImageUrl?: string | null
  signatureImageUrl?: string | null
  updatedAt: string
}

const STORAGE_KEY = "glonetz_school_cert_template_v2"
const LEGACY_STORAGE_KEY = "glonetz_school_cert_template_v1"
export const SCHOOL_CERT_TEMPLATE_UPDATED_EVENT = "school-cert-template-updated"

let apiTemplateCache: SchoolCertificateTemplate | null = null

function isApiDataProvider() {
  return (process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock") === "api"
}

function parseTemplatePayload(data: unknown): SchoolCertificateTemplate {
  if (!data || typeof data !== "object") throw new Error("SCHOOL_CERT_TEMPLATE_MISSING")
  const record = data as Record<string, unknown>
  const template = record.template ?? data
  return normalizeTemplate(template as Partial<SchoolCertificateTemplate>)
}

export const SCHOOL_CERT_PLACEHOLDERS = [
  "{{fullName}}",
  "{{dateOfBirth}}",
  "{{placeOfBirth}}",
  "{{className}}",
  "{{referenceLevel}}",
  "{{periodStart}}",
  "{{periodEnd}}",
  "{{timeSlotCompact}}",
  "{{timeSlotCompactDe}}",
  "{{timeSlotHours}}",
  "{{issueDate}}",
  "{{referenceNumber}}",
] as const

export const DEFAULT_SCHOOL_CERTIFICATE_TEMPLATE: SchoolCertificateTemplate = {
  documentTitle: "ATTESTATION DE PARTICIPATION/TEILNAHMEBESCHEINIGUNG",
  sections: [
    {
      id: "intro",
      title: "Introduction",
      content:
        "La direction du centre Glonetz certifie par la présente que / Die Leitung Zentrums Glonetz bescheinigt hiermit, dass:",
    },
    {
      id: "body_fr",
      title: "Corps (français)",
      content:
        "Est actuellement inscrit(e) et suit des cours au sein de notre centre de langue Glonetz au niveau {{referenceLevel}}, pour la tranche horaire de {{timeSlotCompact}}. Cette attestation confirme la scolarité et la fréquentation régulière du centre à la date indiquée ci-dessus. Ce document est délivré à la demande de l'intéressé(e) et n'a pas la valeur d'un diplôme officiel.",
    },
    {
      id: "body_de",
      title: "Corps (allemand)",
      content:
        "Ist aktuell in unserem Sprachzentrum Glonetz eingeschrieben und besucht Kurse auf Niveau {{referenceLevel}} für den Zeitraum von {{timeSlotCompactDe}}. Dieses Zertifikat bestätigt den Schulbesuch und die regelmäßige Teilnahme am Zentrum zum oben angegebenen Datum. Dieses Dokument wird auf Antrag der betreffenden Person ausgestellt und hat nicht den Wert eines offiziellen Diploms.",
    },
    {
      id: "closing",
      title: "Formule de clôture",
      content:
        "Cette attestation est établie uniquement pour servir et valoir ce que de droit. / Dieses Zertifikat dient ausschließlich den gesetzlich vorgeschriebenen Zwecken und ist für diese gültig.",
    },
  ],
  stampOffsetXCm: 0,
  stampOffsetYCm: 0,
  signatureOffsetXCm: 0,
  signatureOffsetYCm: 0,
  stampApproved: false,
  signatureApproved: false,
  updatedAt: new Date().toISOString(),
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function isLegacyTemplate(raw: Partial<SchoolCertificateTemplate>): boolean {
  const title = raw.documentTitle ?? ""
  if (title.includes("CERTIFICAT DE SCOLARIT") || title.includes("CERTIFICAT DE SCOLARITE")) return true
  const ids = raw.sections?.map((s) => s.id) ?? []
  return ids.includes("identity") || ids.includes("enrollment") || ids.includes("purpose")
}

function mergeSections(stored: SchoolCertificateTemplateSection[] | undefined): SchoolCertificateTemplateSection[] {
  const defaults = DEFAULT_SCHOOL_CERTIFICATE_TEMPLATE.sections
  if (!Array.isArray(stored) || stored.length === 0) return defaults.map((s) => ({ ...s }))
  return defaults.map((def) => {
    const found = stored.find((s) => s.id === def.id)
    return found ? { ...def, ...found } : { ...def }
  })
}

function clampOffsetCm(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.min(5, Math.max(-5, Math.round(value * 10) / 10))
}

function normalizeTemplate(raw: Partial<SchoolCertificateTemplate>): SchoolCertificateTemplate {
  if (isLegacyTemplate(raw)) {
    return { ...DEFAULT_SCHOOL_CERTIFICATE_TEMPLATE }
  }
  const base = {
    ...DEFAULT_SCHOOL_CERTIFICATE_TEMPLATE,
    ...raw,
    sections: mergeSections(raw.sections),
    stampOffsetXCm: clampOffsetCm(raw.stampOffsetXCm),
    stampOffsetYCm: clampOffsetCm(raw.stampOffsetYCm),
    signatureOffsetXCm: clampOffsetCm(raw.signatureOffsetXCm),
    signatureOffsetYCm: clampOffsetCm(raw.signatureOffsetYCm),
    stampApproved: Boolean(raw.stampApproved),
    signatureApproved: Boolean(raw.signatureApproved),
    stampImageUrl:
      typeof raw.stampImageUrl === "string" && raw.stampImageUrl.startsWith("data:image")
        ? raw.stampImageUrl
        : null,
    signatureImageUrl:
      typeof raw.signatureImageUrl === "string" && raw.signatureImageUrl.startsWith("data:image")
        ? raw.signatureImageUrl
        : null,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  }
  return {
    ...base,
    stampPlacement: resolveStampPlacement(base),
    signaturePlacement: resolveSignaturePlacement(base),
  }
}

export const SchoolCertificateTemplateService = {
  get(): SchoolCertificateTemplate {
    if (apiTemplateCache) return { ...apiTemplateCache }
    if (!canUseStorage()) return { ...DEFAULT_SCHOOL_CERTIFICATE_TEMPLATE }
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SCHOOL_CERTIFICATE_TEMPLATE }
    try {
      const parsed = normalizeTemplate(JSON.parse(raw) as SchoolCertificateTemplate)
      if (localStorage.getItem(STORAGE_KEY) === null && !isLegacyTemplate(parsed)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      }
      return parsed
    } catch {
      return { ...DEFAULT_SCHOOL_CERTIFICATE_TEMPLATE }
    }
  },

  async fetch(): Promise<SchoolCertificateTemplate> {
    if (isApiDataProvider()) {
      const data = await apiRequest<unknown>("/users/school-certificates/template", { method: "GET" })
      const next = parseTemplatePayload(data)
      apiTemplateCache = next
      if (canUseStorage()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      }
      window.dispatchEvent(new Event(SCHOOL_CERT_TEMPLATE_UPDATED_EVENT))
      return { ...next }
    }
    return this.get()
  },

  save(template: SchoolCertificateTemplate): SchoolCertificateTemplate {
    const next = normalizeTemplate({ ...template, updatedAt: new Date().toISOString() })
    if (canUseStorage()) {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event(SCHOOL_CERT_TEMPLATE_UPDATED_EVENT))
    }
    return next
  },

  reset(): SchoolCertificateTemplate {
    apiTemplateCache = null
    if (canUseStorage()) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      window.dispatchEvent(new Event(SCHOOL_CERT_TEMPLATE_UPDATED_EVENT))
    }
    return { ...DEFAULT_SCHOOL_CERTIFICATE_TEMPLATE }
  },

  isReadyForLearnerDownload(): boolean {
    const t = this.get()
    return t.stampApproved && t.signatureApproved
  },
}
