"use client"

import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  CreditCard,
  AlertCircle,
  User,
  Wallet,
  LogOut,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useLocale } from "@/hooks/use-locale"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useRouteLoader } from "@/components/route-loader"
import type { TranslationKey } from "@/services/i18n"

interface NavItemDef {
  labelKey: TranslationKey
  icon: React.ReactNode
  href?: string
  isLogout?: boolean
}

interface NavSectionDef {
  items: NavItemDef[]
}

const navSections: NavSectionDef[] = [
  {
    items: [
      { labelKey: "nav_dashboard", icon: <LayoutDashboard className="size-4" />, href: "/dashboard" },
      { labelKey: "nav_make_payment", icon: <CreditCard className="size-4" />, href: "/dashboard/effectuer-paiement" },
      { labelKey: "nav_my_payments", icon: <Wallet className="size-4" />, href: "/dashboard/mes-paiements" },
      { labelKey: "nav_claims", icon: <AlertCircle className="size-4" />, href: "/dashboard/reclamations" },
      { labelKey: "nav_my_profile", icon: <User className="size-4" />, href: "/dashboard/mon-profil" },
    ],
  },
  {
    items: [{ labelKey: "nav_logout", icon: <LogOut className="size-4" />, isLogout: true }],
  },
]

export function getDashboardNavSections(): NavSectionDef[] {
  return navSections
}

export function SidebarNav({
  className,
  onLogout,
}: {
  className?: string
  onLogout?: () => void
  role?: unknown
}) {
  const { t } = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { startLoading } = useRouteLoader()

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center justify-center px-4 pt-5 pb-3">
        <Image src="/images/logo.png" alt="Glonetz" width={160} height={60} className="h-16 w-auto brightness-0 invert" />
      </div>

      <div className="flex justify-end px-4 py-1">
        <ChevronUp className="size-3 text-muted-foreground" />
      </div>

      <ScrollArea className="flex-1 min-h-0 px-2">
        <nav className="flex flex-col gap-4 pb-4">
          {navSections.map((section) => (
            <div key={section.items[0]?.labelKey ?? "section"}>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.labelKey}>
                    <button
                      onClick={() => {
                        if (item.isLogout) {
                          onLogout?.()
                          return
                        }
                        if (item.href) {
                          startLoading(item.href)
                          router.push(item.href)
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        item.href === "/dashboard"
                          ? pathname === "/dashboard" && "bg-sidebar-accent text-sidebar-accent-foreground"
                          : item.href && pathname.startsWith(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      {item.icon}
                      {t(item.labelKey)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="flex justify-end px-4 py-1">
        <ChevronDown className="size-3 text-muted-foreground" />
      </div>

      <div className="border-t border-sidebar-border px-3 py-3">
        <LanguageSwitcher />
      </div>
    </div>
  )
}
