"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"

interface DataLoadErrorProps {
  onRetry: () => void
  /** Désactive le bouton pendant un nouvel essai en cours. */
  retrying?: boolean
  /** Permet de surcharger les textes par défaut (sinon traduits). */
  title?: string
  description?: string
  className?: string
  /** Affiche l'erreur en surcouche plein écran (recouvre le menu), comme une 404. */
  fullScreen?: boolean
}

/**
 * Bloc d'erreur affiché lorsqu'un chargement de données échoue réellement
 * (et qu'aucune donnée en cache n'est disponible). À distinguer de l'état
 * « vide » légitime (le backend répond mais il n'y a pas de données).
 */
export function DataLoadError({
  onRetry,
  retrying = false,
  title,
  description,
  className,
  fullScreen = false,
}: DataLoadErrorProps) {
  const { t } = useLocale()

  const content = (
    <>
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title ?? t("data_error_title")}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description ?? t("data_error_desc")}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
        {t("data_error_retry")}
      </button>
    </>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border bg-card/80 p-8 text-center shadow-xl backdrop-blur">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center ${className ?? ""}`}
    >
      {content}
    </div>
  )
}
