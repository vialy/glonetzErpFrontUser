"use client"

import { Check, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/use-locale"
import type { Locale } from "@/services/i18n"

const LANGUAGES: { code: Locale; flag: string }[] = [
  { code: "fr", flag: "FR" },
  { code: "en", flag: "EN" },
]

export function TopBarCompactLanguage({ ariaLabel }: { ariaLabel: string }) {
  const { locale, setLocale, t } = useLocale()
  const current = LANGUAGES.find((l) => l.code === locale)!

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 text-muted-foreground hover:text-foreground"
          aria-label={ariaLabel}
        >
          <Languages className="size-4" />
          <span className="absolute -bottom-0.5 -right-0.5 rounded bg-muted px-0.5 text-[9px] font-bold leading-none text-foreground">
            {current.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => setLocale(lang.code)} className="text-sm">
            <span className="mr-2 text-xs font-bold">{lang.flag}</span>
            {lang.code === "fr" ? t("language_fr") : t("language_en")}
            {locale === lang.code ? <Check className="ml-auto size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
