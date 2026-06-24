"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownRight, ArrowUpRight, MoveRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export type StudentKpiTileTone = "violet" | "sky" | "emerald" | "amber" | "rose"

type ToneStyle = {
  card: string
  category: string
  spark: string
}

const TONE_STYLES: Record<StudentKpiTileTone, ToneStyle> = {
  violet: {
    card: "border-violet-200/70 bg-violet-50/80 dark:border-violet-500/20 dark:bg-violet-500/[0.08]",
    category: "text-violet-600 dark:text-violet-300",
    spark: "#7c3aed",
  },
  sky: {
    card: "border-sky-200/70 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/[0.08]",
    category: "text-sky-600 dark:text-sky-300",
    spark: "#0284c7",
  },
  emerald: {
    card: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]",
    category: "text-emerald-600 dark:text-emerald-300",
    spark: "#059669",
  },
  amber: {
    card: "border-amber-200/70 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/[0.08]",
    category: "text-amber-600 dark:text-amber-300",
    spark: "#d97706",
  },
  rose: {
    card: "border-rose-200/70 bg-rose-50/80 dark:border-rose-500/20 dark:bg-rose-500/[0.08]",
    category: "text-rose-600 dark:text-rose-300",
    spark: "#e11d48",
  },
}

let idCounter = 0
function useLocalId() {
  const ref = useRef<string>()
  if (!ref.current) {
    idCounter += 1
    ref.current = `stu-spark-grad-${idCounter}`
  }
  return ref.current
}

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const gradientId = useLocalId()
  const path = useMemo(() => {
    if (data.length < 2) return null
    const width = 88
    const height = 34
    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1
    const stepX = width / (data.length - 1)
    const points = data.map((value, index) => {
      const x = index * stepX
      const y = height - ((value - min) / span) * height
      return { x, y }
    })
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
    const area = `${line} L${width},${height} L0,${height} Z`
    return { line, area, width, height }
  }, [data])

  if (!path) return null

  return (
    <svg
      viewBox={`0 0 ${path.width} ${path.height}`}
      className="h-9 w-[88px] shrink-0"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${gradientId})`} />
      <path d={path.line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StudentKpiTile({
  categoryLabel,
  categoryHref,
  label,
  value,
  unit,
  deltaPct = null,
  periodLabel,
  series = [],
  tone = "violet",
  invertDelta = false,
  loading = false,
}: {
  categoryLabel: string
  categoryHref?: string
  label: string
  value: string
  unit?: string
  deltaPct?: number | null
  periodLabel: string
  series?: number[]
  tone?: StudentKpiTileTone
  invertDelta?: boolean
  loading?: boolean
}) {
  const toneStyle = TONE_STYLES[tone]

  const [valuePulse, setValuePulse] = useState(false)
  const previousValueRef = useRef(value)
  useEffect(() => {
    if (previousValueRef.current === value) return
    previousValueRef.current = value
    setValuePulse(true)
    const timer = window.setTimeout(() => setValuePulse(false), 450)
    return () => window.clearTimeout(timer)
  }, [value])

  const hasDelta = deltaPct !== null && Number.isFinite(deltaPct)
  const isGood = hasDelta ? (invertDelta ? deltaPct! <= 0 : deltaPct! >= 0) : true
  const deltaColor = !hasDelta
    ? "text-muted-foreground"
    : isGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400"
  const deltaText = hasDelta ? `${deltaPct! > 0 ? "+" : ""}${deltaPct!.toFixed(2)}%` : "\u2014"

  const category = (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${toneStyle.category}`}>
      {categoryLabel}
      <MoveRight className="size-3 -rotate-45" />
    </span>
  )

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${toneStyle.card}`}
    >
      <div className="mb-2 flex items-start justify-end">
        {categoryHref ? (
          <Link href={categoryHref} className="transition hover:opacity-80">
            {category}
          </Link>
        ) : (
          category
        )}
      </div>

      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <p
          className={`flex items-baseline gap-1 tabular-nums text-foreground transition-all duration-300 ${
            valuePulse ? "scale-[1.02] opacity-95" : "scale-100 opacity-100"
          }`}
        >
          <span className="text-[1.7rem] font-extrabold leading-none tracking-tight">{value}</span>
          {unit ? <span className="text-xs font-medium text-muted-foreground">{unit}</span> : null}
        </p>
      )}

      <p className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className={`flex items-center gap-0.5 text-sm font-semibold ${deltaColor}`}>
            {hasDelta ? (
              isGood ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )
            ) : null}
            {deltaText}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <Sparkline data={series} stroke={toneStyle.spark} />
      </div>
    </div>
  )
}
