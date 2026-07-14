"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Compass, Home } from "lucide-react"

export default function NotFound() {
  const router = useRouter()

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="w-full max-w-md rounded-2xl border bg-card/80 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg">
          <Compass className="size-8" />
        </div>

        <p className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous cherchez n'existe pas, a été déplacée, ou n'est pas accessible avec votre compte.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90"
          >
            <Home className="size-4" />
            Retour à l'accueil
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="size-4" />
            Page précédente
          </button>
        </div>
      </div>
    </main>
  )
}
