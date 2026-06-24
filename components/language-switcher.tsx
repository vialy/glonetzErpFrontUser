"use client"

import { ChevronDown, Check } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"
import type { Locale } from "@/services/i18n"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const languages: { code: Locale; flag: string }[] = [
  { code: "fr", flag: "FR" },
  { code: "en", flag: "EN" },
]

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()
  const labels: Record<Locale, string> = { fr: t("language_fr"), en: t("language_en") }
  const current = languages.find((l) => l.code === locale)!

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md">
          <span className="text-xs font-bold">{current.flag}</span>
          <span>{labels[locale]}</span>
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className="flex items-center gap-2"
          >
            <span className="text-xs font-semibold">{lang.flag}</span>
            <span>{labels[lang.code]}</span>
            {locale === lang.code && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
