"use client"

import Link from "next/link"
import { CheckCircle2, Circle, MapPin, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useLocale } from "@/hooks/use-locale"
import { useRouteLoader } from "@/components/route-loader"
import type { GettingStartedGuideState } from "@/hooks/use-getting-started-guide"
import { cn } from "@/lib/utils"

type GettingStartedGuideSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  guide: GettingStartedGuideState
}

export function GettingStartedGuideSheet({ open, onOpenChange, guide }: GettingStartedGuideSheetProps) {
  const { t } = useLocale()
  const { startLoading } = useRouteLoader()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-4 sm:max-w-sm sm:p-5">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="text-base">{t("guide_sheet_title")}</SheetTitle>
          <SheetDescription className="text-xs leading-snug">{t("guide_sheet_subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              {t("guide_progress")
                .replace("{done}", String(guide.completedCount))
                .replace("{total}", String(guide.total))}
            </span>
            <span className="text-muted-foreground">{guide.progressPercent}%</span>
          </div>
          <Progress value={guide.progressPercent} className="h-1.5" />
          {guide.isComplete ? (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{t("guide_all_done")}</p>
          ) : null}
        </div>

        <ul className="mt-3 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {guide.steps.map((step, index) => {
            const done = guide.isStepDone(step.id)
            const current = guide.currentStep?.id === step.id
            return (
              <li
                key={step.id}
                className={cn(
                  "rounded-lg border px-2.5 py-2 transition-colors",
                  current ? "border-primary/40 bg-primary/5" : "border-border/80 bg-card",
                  done && !current && "opacity-80",
                )}
              >
                <div className="flex gap-2">
                  <div className="mt-0.5 shrink-0">
                    {done ? (
                      <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("guide_step_label").replace("{n}", String(index + 1))}
                      {current ? (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-primary normal-case">
                          <MapPin className="size-2.5" />
                          <span className="text-[10px]">{t("guide_step_here")}</span>
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs font-semibold leading-tight">{t(step.titleKey)}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {t(step.descriptionKey)}
                    </p>
                    {!done ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1.5 h-7 px-2.5 text-[11px]"
                        asChild
                        onClick={() => {
                          startLoading(step.href)
                          onOpenChange(false)
                        }}
                      >
                        <Link href={step.href}>{t("guide_step_go")}</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-3 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full text-[11px]"
            onClick={() => guide.reset()}
          >
            <RotateCcw className="mr-1.5 size-3" />
            {t("guide_reset")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
