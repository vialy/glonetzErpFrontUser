"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2 } from "lucide-react"
import { clearAuthBrowserState } from "@/services/auth.service"
import { useLocale } from "@/hooks/use-locale"

const COUNTDOWN_SECONDS = 5

export default function SessionResetPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)

  useEffect(() => {
    clearAuthBrowserState({ clearMockPinOverrides: false })
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.replace("/login?credentialsReset=1")
      return
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft, router])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border bg-card/80 p-8 text-center shadow-xl backdrop-blur">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-sm font-semibold text-foreground sm:text-base">
          {t("credentials_reset_title")}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("credentials_reset_desc")}</p>
        <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Loader2 className="size-4 animate-spin" />
          {t("credentials_reset_countdown").replace("{seconds}", String(secondsLeft))}
        </p>
      </div>
    </div>
  )
}
