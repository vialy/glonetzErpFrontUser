"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"
import {
  defaultCountries,
  FlagImage,
  parseCountry,
  usePhoneInput,
  type CountryIso2,
  type ParsedCountry,
} from "react-international-phone"

import { cn } from "@/lib/utils"

const PREFERRED_COUNTRIES: CountryIso2[] = ["cm", "ci", "sn", "bf", "bj", "tg", "ng", "fr"]

function fieldShell(invalid?: boolean) {
  return cn(
    "flex h-12 items-center rounded-2xl border bg-muted/50 px-3.5 shadow-sm transition-all",
    "focus-within:border-primary/45 focus-within:bg-background focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/12",
    invalid ? "border-destructive/70 bg-destructive/5" : "border-border/70 hover:border-border",
  )
}

function buildCountryList(search: string): ParsedCountry[] {
  const q = search.trim().toLowerCase()
  const all = defaultCountries.map((entry) => parseCountry(entry))

  const matches = (country: ParsedCountry) => {
    if (!q) return true
    return (
      country.name.toLowerCase().includes(q) ||
      country.dialCode.includes(q.replace("+", "")) ||
      country.iso2.toLowerCase().includes(q)
    )
  }

  const preferred = PREFERRED_COUNTRIES.map((iso) => all.find((c) => c.iso2 === iso)).filter(
    (c): c is ParsedCountry => {
      if (!c) return false
      return matches(c)
    },
  )

  const preferredSet = new Set(preferred.map((c) => c.iso2))
  const rest = all.filter((c) => !preferredSet.has(c.iso2) && matches(c))

  return [...preferred, ...rest]
}

export type PhoneInputFieldProps = {
  value: string
  onChange: (phone: string) => void
  id?: string
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  invalid?: boolean
  defaultCountry?: CountryIso2
  className?: string
}

export function PhoneInputField({
  value,
  onChange,
  id,
  placeholder,
  searchPlaceholder = "Rechercher",
  disabled,
  invalid,
  defaultCountry = "cm",
  className,
}: PhoneInputFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const { inputValue, country, setCountry, handlePhoneValueChange, inputRef } = usePhoneInput({
    defaultCountry,
    value,
    countries: defaultCountries,
    preferredCountries: PREFERRED_COUNTRIES,
    disableDialCodeAndPrefix: true,
    disableFormatting: true,
    onChange: ({ phone }) => onChange(phone),
  })

  const countries = useMemo(() => buildCountryList(search), [search])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={disabled}
          aria-label="Choisir le pays"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            fieldShell(invalid),
            "shrink-0 gap-2 px-3 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <FlagImage iso2={country.iso2} size="20px" className="size-5 rounded-full object-cover" />
          <span className="text-sm font-semibold tabular-nums text-foreground">+{country.dialCode}</span>
        </button>

        <div className={cn(fieldShell(invalid), "min-w-0 flex-1 px-4")}>
          <input
            ref={inputRef}
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            value={inputValue}
            onChange={handlePhoneValueChange}
            placeholder={placeholder}
            className="h-full w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
          />
        </div>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-border/80 bg-popover shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1.5">
            {countries.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">Aucun pays</li>
            ) : (
              countries.map((item, index) => {
                const showDivider =
                  index > 0 &&
                  PREFERRED_COUNTRIES.includes(countries[index - 1]!.iso2) &&
                  !PREFERRED_COUNTRIES.includes(item.iso2)

                return (
                  <li key={item.iso2}>
                    {showDivider ? <div className="my-1.5 border-t border-border/60" /> : null}
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60",
                        item.iso2 === country.iso2 && "bg-primary/8",
                      )}
                      onClick={() => {
                        setCountry(item.iso2, { focusOnInput: true })
                        setOpen(false)
                        setSearch("")
                      }}
                    >
                      <FlagImage iso2={item.iso2} size="20px" className="size-5 shrink-0 rounded-full object-cover" />
                      <span className="w-14 shrink-0 text-sm tabular-nums text-muted-foreground">
                        +{item.dialCode}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                        {item.name}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
