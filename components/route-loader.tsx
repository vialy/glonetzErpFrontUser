"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"

interface RouteLoaderContextValue {
  startLoading: () => void
  notifyRouteReady: () => void
}

const RouteLoaderContext = createContext<RouteLoaderContextValue | null>(null)

/** Durée minimale pour éviter un flash trop court */
const MIN_LOADER_MS = 180
/** Sécurité si une page ne signale jamais son affichage */
const MAX_LOADER_MS = 60_000

export function RouteLoaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [routeReady, setRouteReady] = useState(true)
  const startAtRef = useRef(0)

  const notifyRouteReady = useCallback(() => {
    setRouteReady(true)
  }, [])

  const startLoading = useCallback(() => {
    startAtRef.current = Date.now()
    setRouteReady(false)
    setLoading(true)
  }, [])

  // Nouvelle route : on attend le signal "page affichée"
  useEffect(() => {
    if (!loading) return
    setRouteReady(false)
  }, [pathname, loading])

  // Masquer seulement quand la page a signalé qu'elle est prête (+ délai mini)
  useEffect(() => {
    if (!loading || !routeReady) return

    const elapsed = Date.now() - startAtRef.current
    const remaining = Math.max(MIN_LOADER_MS - elapsed, 0)
    const timer = window.setTimeout(() => setLoading(false), remaining)
    return () => window.clearTimeout(timer)
  }, [loading, routeReady])

  // Filet de sécurité
  useEffect(() => {
    if (!loading) return
    const safety = window.setTimeout(() => setLoading(false), MAX_LOADER_MS)
    return () => window.clearTimeout(safety)
  }, [loading])

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (!target) return
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== "_self") return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      if (!href.startsWith("/")) return

      const current = window.location.pathname + window.location.search
      if (href === current) return
      startLoading()
    }

    document.addEventListener("click", onClickCapture, true)
    return () => document.removeEventListener("click", onClickCapture, true)
  }, [startLoading])

  const value = useMemo(
    () => ({ startLoading, notifyRouteReady }),
    [startLoading, notifyRouteReady],
  )

  return (
    <RouteLoaderContext.Provider value={value}>
      {children}
      {loading ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-background/65 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/95 px-8 py-6 shadow-2xl">
            <div className="relative">
              <div className="size-14 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 size-14 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-accent" />
              <div className="absolute inset-2 rounded-full bg-primary/10" />
            </div>
            <p className="text-sm font-medium text-foreground">Chargement...</p>
          </div>
        </div>
      ) : null}
    </RouteLoaderContext.Provider>
  )
}

/**
 * À placer dans un `template.tsx` (se remonte à chaque navigation).
 * Signale que le contenu de la nouvelle page est monté et peint.
 */
export function RouteReadyMarker() {
  const pathname = usePathname()
  const ctx = useContext(RouteLoaderContext)

  useEffect(() => {
    if (!ctx) return
    let cancelled = false

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (!cancelled) ctx.notifyRouteReady()
      })
      return () => cancelAnimationFrame(raf2)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
    }
  }, [pathname, ctx])

  return null
}

export function useRouteLoader() {
  const ctx = useContext(RouteLoaderContext)
  return {
    startLoading: ctx?.startLoading ?? (() => {}),
  }
}
