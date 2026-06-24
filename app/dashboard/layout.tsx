"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/domains/auth"
import { useAuth } from "@/hooks/use-auth"
import { SidebarNav } from "@/components/sidebar-nav"
import { TopBar } from "@/components/top-bar"
import { GlobalSearchCommand } from "@/components/global-search/global-search-command"
import { GettingStartedGuideSheet } from "@/components/getting-started/getting-started-guide-sheet"
import { useGettingStartedGuide } from "@/hooks/use-getting-started-guide"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { RouteLoaderProvider } from "@/components/route-loader"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useLocale } from "@/hooks/use-locale"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, mustChangePin, logout, role, phone } = useAuth()
  const { t } = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const guide = useGettingStartedGuide(role)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }
    const sessionRole = authService.getSession()?.role
    if (sessionRole && sessionRole !== "student") {
      authService.clearSession()
      router.replace("/login")
      return
    }
    if (mustChangePin) {
      router.replace("/login")
      return
    }
    setReady(true)
    // Revalide le token et rafraîchit la session en arrière-plan ;
    // un token expiré déclenche la déconnexion automatique (handler 401).
    void authService.refreshSession()
  }, [isAuthenticated, mustChangePin, router])

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <RouteLoaderProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col h-full min-h-0 overflow-hidden">
          <SidebarNav onLogout={logout} role={role} />
        </aside>

        {/* Mobile sidebar (sheet) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar">
            <SheetTitle className="sr-only">{t("nav_menu")}</SheetTitle>
            <SidebarNav onLogout={logout} role={role} />
          </SheetContent>
        </Sheet>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <TopBar
            onMenuToggle={handleMenuToggle}
            role={role}
            phone={phone}
            onLogout={logout}
            guideCompleted={guide.completedCount}
            guideTotal={guide.total}
            onGuideClick={() => setGuideOpen(true)}
            onSearchOpen={() => setSearchOpen(true)}
          />
          <GlobalSearchCommand
            open={searchOpen}
            onOpenChange={setSearchOpen}
            role={role}
            phone={phone}
          />
          <GettingStartedGuideSheet open={guideOpen} onOpenChange={setGuideOpen} guide={guide} />
          <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>

        <MobileBottomNav role={role} />
      </div>
    </RouteLoaderProvider>
  )
}
