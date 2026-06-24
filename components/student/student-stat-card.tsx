"use client"

import type { ReactNode } from "react"
import { Info, TrendingDown, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export type StudentStatTone = "indigo" | "emerald" | "amber" | "sky" | "rose" | "slate"

type ToneStyle = {
  iconWrap: string
  glow: string
  ring: string
}

const TONE: Record<StudentStatTone, ToneStyle> = {
  indigo: {
    iconWrap: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/30",
    glow: "bg-indigo-500/10",
    ring: "ring-indigo-500/10",
  },
  emerald: {
    iconWrap: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30",
    glow: "bg-emerald-500/10",
    ring: "ring-emerald-500/10",
  },
  amber: {
    iconWrap: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30",
    glow: "bg-amber-500/10",
    ring: "ring-amber-500/10",
  },
  sky: {
    iconWrap: "bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sky-500/30",
    glow: "bg-sky-500/10",
    ring: "ring-sky-500/10",
  },
  rose: {
    iconWrap: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-rose-500/30",
    glow: "bg-rose-500/10",
    ring: "ring-rose-500/10",
  },
  slate: {
    iconWrap: "bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-slate-500/30",
    glow: "bg-slate-500/10",
    ring: "ring-slate-500/10",
  },
}

export function StudentStatCard({
  icon,
  tone = "indigo",
  label,
  value,
  hint,
  trend,
  showInfo = true,
  loading = false,
}: {
  icon: ReactNode
  tone?: StudentStatTone
  label: string
  value: string
  hint?: string
  trend?: { value: string; positive?: boolean }
  showInfo?: boolean
  loading?: boolean
}) {
  const toneStyle = TONE[tone]
  const positive = trend?.positive ?? true

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 p-4 shadow-sm ring-1 ${toneStyle.ring} backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-10 size-28 rounded-full ${toneStyle.glow} blur-2xl transition-opacity duration-300 group-hover:opacity-80`}
      />

      <div className="relative flex items-center gap-3.5">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105 ${toneStyle.iconWrap}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="truncate">{label}</span>
            {showInfo ? <Info className="size-3 shrink-0 opacity-50" /> : null}
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <p className="truncate text-xl font-extrabold tracking-tight tabular-nums text-foreground md:text-2xl">
                  {value}
                </p>
                {trend ? (
                  <span
                    className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                      positive
                        ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/12 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {trend.value}
                  </span>
                ) : null}
              </>
            )}
          </div>

          {hint && !loading ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </div>
  )
}
