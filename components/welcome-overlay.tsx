"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useLocale } from "@/hooks/use-locale"
import { displayFirstName } from "@/lib/welcome-session"

const DISPLAY_MS = 2400
const FADE_MS = 500

type WelcomeOverlayProps = {
  name: string | null
  onDone: () => void
}

export function WelcomeOverlay({ name: rawName, onDone }: WelcomeOverlayProps) {
  const { t } = useLocale()
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter")
  const name = displayFirstName(rawName, t("welcome_fallback_name"))

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setPhase("visible"), 50)
    const exitTimer = window.setTimeout(() => setPhase("exit"), DISPLAY_MS)
    const doneTimer = window.setTimeout(onDone, DISPLAY_MS + FADE_MS)
    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-accent transition-opacity duration-500 ${
        phase === "enter" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      aria-live="polite"
      aria-label={`${t("welcome_greeting")} ${name}`}
    >
      <div
        className={`flex flex-col items-center px-6 text-center text-primary-foreground transition-all duration-700 ${
          phase === "visible"
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        <Image
          src="/images/logo.png"
          alt="Glonetz"
          width={180}
          height={64}
          className="mb-8 h-16 w-auto brightness-0 invert"
          priority
        />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground/75">
          {t("welcome_greeting")}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{name}</h1>
        <p className="mt-4 max-w-sm text-base text-primary-foreground/80">{t("welcome_subtitle")}</p>
        <div className="mt-10 h-1 w-16 overflow-hidden rounded-full bg-primary-foreground/20">
          <div className="h-full rounded-full bg-primary-foreground/90 animate-welcome-progress" />
        </div>
      </div>
    </div>
  )
}
