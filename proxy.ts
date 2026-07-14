import { NextResponse, type NextRequest } from "next/server"

/**
 * Garde serveur (Next.js « proxy », ex-middleware) pour l'app apprenant.
 * Vérifie la PRÉSENCE d'une session (cookie) et que le rôle est bien "student"
 * avant le rendu des pages /dashboard.
 *
 * La validation cryptographique du token reste assurée par le backend sur
 * chaque endpoint (et par refreshSession() au chargement).
 */
const SESSION_COOKIE = "glonetz_student_session"

interface SessionPayload {
  token?: string
  role?: string
  mustChangePin?: boolean
}

function parseSession(raw: string | undefined): SessionPayload | null {
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw)) as SessionPayload
  } catch {
    try {
      return JSON.parse(raw) as SessionPayload
    } catch {
      return null
    }
  }
}

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value)
  const isStudent = !session?.role || session.role === "student"

  if (pathname.startsWith("/dashboard")) {
    if (!session?.token) {
      return redirectToLogin(request)
    }
    if (!isStudent) {
      return redirectToLogin(request)
    }
    if (session.mustChangePin) {
      return redirectToLogin(request)
    }
    return NextResponse.next()
  }

  // Utilisateur déjà connecté qui arrive sur /login ou / → on l'envoie au dashboard.
  if (
    (pathname === "/login" || pathname === "/") &&
    session?.token &&
    !session.mustChangePin &&
    isStudent
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
}
