"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  School,
  Users,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { useRouteLoader } from "@/components/route-loader"
import { useGlobalSearchIndex } from "@/hooks/use-global-search-index"
import { groupGlobalSearchItems, type GlobalSearchGroupId } from "@/lib/global-search-index"
import { useLocale } from "@/hooks/use-locale"
import type { UserRole } from "@/types"

const GROUP_ICONS: Record<GlobalSearchGroupId, React.ReactNode> = {
  pages: <LayoutDashboard className="size-4 shrink-0 opacity-70" />,
  learners: <GraduationCap className="size-4 shrink-0 opacity-70" />,
  classes: <School className="size-4 shrink-0 opacity-70" />,
  payments: <CreditCard className="size-4 shrink-0 opacity-70" />,
  claims: <AlertCircle className="size-4 shrink-0 opacity-70" />,
  users: <Users className="size-4 shrink-0 opacity-70" />,
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return target.isContentEditable
}

interface GlobalSearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: UserRole | null
  phone?: string | null
}

export function GlobalSearchCommand({ open, onOpenChange, role, phone }: GlobalSearchCommandProps) {
  const { t } = useLocale()
  const router = useRouter()
  const { startLoading } = useRouteLoader()
  const items = useGlobalSearchIndex(role, phone)
  const groups = groupGlobalSearchItems(items, t)

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false)
      startLoading(href)
      router.push(href)
    },
    [onOpenChange, router, startLoading],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onOpenChange(true)
        return
      }
      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onOpenChange])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("global_search_title")}
      description={t("global_search_description")}
      className="sm:max-w-xl"
    >
      <CommandInput placeholder={t("global_search_input_placeholder")} />
      <CommandList className="max-h-[min(60vh,420px)]">
        <CommandEmpty>{t("global_search_empty")}</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.group} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.subtitle ?? ""} ${item.keywords}`}
                onSelect={() => navigate(item.href)}
                className="gap-3"
              >
                {GROUP_ICONS[item.group] ?? <FileText className="size-4 shrink-0 opacity-70" />}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">{item.title}</span>
                  {item.subtitle ? (
                    <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                  ) : null}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <p className="border-t px-3 py-2 text-center text-[11px] text-muted-foreground">
        {t("global_search_hint")}
        <CommandShortcut className="ml-1.5 hidden sm:inline">Ctrl K</CommandShortcut>
      </p>
    </CommandDialog>
  )
}
