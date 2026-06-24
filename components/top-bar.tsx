"use client"

import { useRouter } from "next/navigation"
import { Bell, LogOut, Menu, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TopBarCompactLanguage } from "@/components/top-bar-compact-language"
import { useLocale } from "@/hooks/use-locale"
import { useTopBarNotifications } from "@/hooks/use-top-bar-notifications"
import { getProfileHref } from "@/lib/top-bar-nav"
import { useRouteLoader } from "@/components/route-loader"
import type { UserRole } from "@/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopBarProps {
  onMenuToggle: () => void
  role?: UserRole | null
  phone?: string | null
  onLogout?: () => void
  guideCompleted?: number
  guideTotal?: number
  onGuideClick?: () => void
  onSearchOpen?: () => void
}

export function TopBar({
  onMenuToggle,
  role = null,
  phone,
  onLogout,
  guideCompleted = 0,
  guideTotal = 0,
  onGuideClick,
  onSearchOpen,
}: TopBarProps) {
  const { t } = useLocale()
  const router = useRouter()
  const { startLoading } = useRouteLoader()
  const notifications = useTopBarNotifications()
  const profileHref = getProfileHref()

  function navigate(href: string) {
    startLoading()
    router.push(href)
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 lg:hidden"
          onClick={onMenuToggle}
          aria-label={t("open_menu")}
        >
          <Menu className="size-5" />
        </Button>

        <button
          type="button"
          onClick={onSearchOpen}
          className="hidden items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-left transition-colors hover:bg-muted/50 sm:flex"
          aria-label={t("global_search_title")}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <span className="w-32 text-sm text-muted-foreground md:w-44">{t("search_placeholder")}</span>
          <kbd className="ml-1 hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
            Ctrl K
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 sm:hidden"
          onClick={onSearchOpen}
          aria-label={t("global_search_title")}
        >
          <Search className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-0.5 md:gap-1">
        <button
          type="button"
          onClick={onGuideClick}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <span className="hidden sm:inline">{t("guide")}</span>
          <span className="sm:hidden">{t("guide_short")}</span>
          {guideTotal > 0 ? (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
              {guideCompleted}/{guideTotal}
            </span>
          ) : null}
        </button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8 text-muted-foreground hover:text-foreground"
              aria-label={t("topbar_notif_aria")}
            >
              <Bell className="size-4" />
              {notifications.totalBadge > 0 ? (
                <span className="absolute -right-1 -top-1 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[11px] font-bold leading-none text-white tabular-nums">
                  {notifications.totalBadge > 9 ? "9+" : notifications.totalBadge}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs">{t("topbar_notif_title")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.items.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">{t("topbar_notif_empty")}</p>
            ) : (
              notifications.items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="cursor-pointer text-sm"
                  onClick={() => navigate(item.href)}
                >
                  <span className="flex-1">{t(item.labelKey)}</span>
                  {item.count > 0 ? (
                    <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {item.count}
                    </span>
                  ) : null}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <TopBarCompactLanguage ariaLabel={t("topbar_lang_aria")} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              aria-label={t("topbar_profile_aria")}
            >
              <User className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {phone ? (
              <>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {phone}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => navigate(profileHref)}>
              {t("topbar_profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-sm text-destructive focus:text-destructive"
              onClick={() => onLogout?.()}
            >
              <LogOut className="mr-2 size-4" />
              {t("nav_logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
