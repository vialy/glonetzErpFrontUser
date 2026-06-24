"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="text-muted-foreground">
        <Sun className="size-5" />
        <span className="sr-only">Changer le theme</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Changer le theme"
    >
      {theme === "dark" ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
      <span className="sr-only">
        {theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      </span>
    </Button>
  )
}
