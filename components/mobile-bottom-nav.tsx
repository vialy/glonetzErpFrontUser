"use client"

import { usePathname, useRouter } from "next/navigation"
import { AlertCircle, CreditCard, Home, User, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouteLoader } from "@/components/route-loader"
import { useLocale } from "@/hooks/use-locale"
import type { TranslationKey } from "@/services/i18n"

interface MobileItem {
  labelKey: TranslationKey
  href: string
  icon: React.ReactNode
}

const items: MobileItem[] = [
  { labelKey: "mob_stu_dash", href: "/dashboard", icon: <Home className="size-4" /> },
  { labelKey: "mob_stu_pay", href: "/dashboard/effectuer-paiement", icon: <CreditCard className="size-4" /> },
  { labelKey: "mob_stu_payments", href: "/dashboard/mes-paiements", icon: <Wallet className="size-4" /> },
  { labelKey: "mob_stu_claims", href: "/dashboard/reclamations", icon: <AlertCircle className="size-4" /> },
  { labelKey: "mob_stu_profile", href: "/dashboard/mon-profil", icon: <User className="size-4" /> },
]

export function MobileBottomNav({ role: _role }: { role?: unknown }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()
  const { startLoading } = useRouteLoader()

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <nav className="mx-auto flex max-w-screen-sm items-stretch justify-around px-2 py-2">
        {items.map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                startLoading(item.href)
                router.push(item.href)
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon}
              <span className="truncate">{t(item.labelKey)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
