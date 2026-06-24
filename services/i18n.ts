import type { messages as frMessages } from "@/services/messages/fr"

export type Locale = "fr" | "en"

export type TranslationKey = keyof typeof frMessages
