"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { Locale, TranslationKey } from "@/services/i18n"
import { messages as frMessages } from "@/services/messages/fr"

const LOCALE_STORAGE_KEY = "glonetz_locale"

type Messages = Record<TranslationKey, string>

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr")
  const [messages, setMessages] = useState<Messages>(frMessages as Messages)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
      if (saved === "en" || saved === "fr") {
        setLocaleState(saved)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (locale === "fr") {
      setMessages(frMessages as Messages)
      return
    }
    let cancelled = false
    import("@/services/messages/en").then((mod) => {
      if (!cancelled) setMessages(mod.messages as Messages)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "en" ? "en" : "fr"
    }
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
  }, [locale])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
  }, [])

  const t = useCallback((key: TranslationKey) => messages[key] ?? key, [messages])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider")
  }
  return context
}
