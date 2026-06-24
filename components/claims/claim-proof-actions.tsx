"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  defaultClaimProofFilename,
  downloadClaimProof,
  isClaimProofReadable,
  proofToObjectUrl,
  revokeProofUrl,
} from "@/lib/claim-proof"
import { cn } from "@/lib/utils"

type ClaimProofActionsProps = {
  claimId: string
  screenshotDataUrl: string
  screenshotName?: string
  viewLabel: string
  downloadLabel: string
  previewTitle?: string
  className?: string
}

export function ClaimProofActions({
  claimId,
  screenshotDataUrl,
  screenshotName,
  viewLabel,
  downloadLabel,
  previewTitle = "Preuve de reclamation",
  className,
}: ClaimProofActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const filename = defaultClaimProofFilename(claimId, screenshotName)
  const readable = isClaimProofReadable(screenshotDataUrl)

  const previewUrl = useMemo(() => {
    if (!previewOpen || !readable) return null
    return proofToObjectUrl(screenshotDataUrl)
  }, [previewOpen, readable, screenshotDataUrl])

  useEffect(() => {
    return () => revokeProofUrl(previewUrl)
  }, [previewUrl])

  function handleDownload() {
    downloadClaimProof(screenshotDataUrl, filename)
  }

  if (!readable) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Preuve indisponible ou fichier corrompu.
      </p>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-8 rounded-lg text-xs", className)}
        onClick={() => setPreviewOpen(true)}
      >
        <Eye className="mr-1.5 size-3.5" />
        {viewLabel}
      </Button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[min(96vw,520px)] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base">{previewTitle}</DialogTitle>
            <DialogDescription className="text-xs">
              {screenshotName ?? claimId}
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[min(70vh,520px)] items-center justify-center bg-muted/30 p-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={screenshotName ?? "Preuve de reclamation"}
                className="max-h-[min(65vh,480px)] w-full rounded-lg object-contain shadow-sm"
              />
            ) : (
              <p className="px-4 py-8 text-sm text-muted-foreground">Impossible d&apos;afficher la capture.</p>
            )}
          </div>
          <DialogFooter className="gap-2 border-t px-4 py-3 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
              Fermer
            </Button>
            <Button type="button" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 size-3.5" />
              {downloadLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
