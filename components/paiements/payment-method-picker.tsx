"use client"

import { Smartphone } from "lucide-react"
import type { PaymentMethod } from "@/domains/payments"
import { useLocale } from "@/hooks/use-locale"
import { cn } from "@/lib/utils"

const METHODS: {
  id: PaymentMethod
  labelKey: "sp_method_om" | "sp_method_mtn"
  needsPhone: boolean
}[] = [
  { id: "orange_money", labelKey: "sp_method_om", needsPhone: true },
  { id: "mtn_momo", labelKey: "sp_method_mtn", needsPhone: true },
]

type PaymentMethodPickerProps = {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  className?: string
  compact?: boolean
}

export function PaymentMethodPicker({ value, onChange, className, compact }: PaymentMethodPickerProps) {
  const { t } = useLocale()

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
      {METHODS.map((item) => {
        const active = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
              compact && "px-3 py-2.5",
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/30",
            )}
          >
            <Smartphone className={cn("size-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("font-medium", compact ? "text-sm" : "text-sm")}>{t(item.labelKey)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function paymentMethodNeedsPhone(method: PaymentMethod): boolean {
  return METHODS.find((m) => m.id === method)?.needsPhone ?? true
}
