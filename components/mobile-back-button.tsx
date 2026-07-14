"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useRouteLoader } from "@/components/route-loader"

export function MobileBackButton({ fallbackHref = "/dashboard" }: { fallbackHref?: string }) {
  const router = useRouter()
  const { startLoading } = useRouteLoader()

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        className="mb-1 h-8 px-2 text-muted-foreground"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            startLoading()
            router.back()
            return
          }
          startLoading(fallbackHref)
          router.push(fallbackHref)
        }}
      >
        <ArrowLeft className="mr-1 size-4" />
        Retour
      </Button>
    </div>
  )
}

