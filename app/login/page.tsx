"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LoginForm } from "./login-form"
import { authService } from "@/domains/auth"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, mustChangePin } = useAuth()
  const { t } = useLocale()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sessionRole = authService.getSession()?.role
    if (isAuthenticated && sessionRole && sessionRole !== "student") {
      authService.clearSession()
      setReady(true)
      return
    }
    if (isAuthenticated && !mustChangePin) {
      router.replace("/dashboard")
    } else {
      setReady(true)
    }
  }, [isAuthenticated, mustChangePin, router])

  if (!ready) return null

  return (
    <div className="flex min-h-dvh overflow-hidden lg:h-dvh">
      {/* Left - Login form */}
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-gradient-to-br from-secondary via-card to-accent/20 lg:w-1/2 lg:bg-none lg:bg-card">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Right - Hero image (hidden on mobile) */}
      <div className="relative hidden lg:block lg:w-1/2">
        <Image
          src="/images/login-hero.jpg"
          alt="Etudiante souriante dans un centre de formation Glonetz"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <h2 className="text-3xl font-bold text-white text-balance">
            {t("hero_title")}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-white/85">
            {t("hero_subtitle")}
          </p>
        </div>
      </div>
    </div>
  )
}
