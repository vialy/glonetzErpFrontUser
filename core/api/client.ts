"use client"

import { SESSION_KEY } from "@/services/auth.service"
import { handleSessionUnauthorized, isSessionUnauthorizedError } from "@/core/api/unauthorized"

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  raw?: boolean
}

export class ApiClientError extends Error {
  status: number
  payload: unknown
  errorCode?: number

  constructor(message: string, status: number, payload: unknown, errorCode?: number) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.payload = payload
    this.errorCode = errorCode
  }
}

export type ApiEnvelope<T> = {
  success: boolean
  data: T | null
  errorMsg?: string | null
  errorCode?: number | null
}

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "data" in value
  )
}

function normalizeApiPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return normalized.startsWith("/api/") ? normalized : `/api${normalized}`
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
  if (!baseUrl) {
    throw new ApiClientError("NEXT_PUBLIC_API_BASE_URL is not configured", 0, null)
  }
  const url = new URL(`${baseUrl}${normalizeApiPath(path)}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

function getAuthToken() {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(^| )${SESSION_KEY}=([^;]+)`))
  if (!match) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(match[2])) as { token?: string }
    return parsed.token ?? null
  } catch {
    return null
  }
}

function getLanguageHeader(): string {
  if (typeof document === "undefined") return "fr"
  const match = document.cookie.match(/(?:^|;\s*)glonetz_locale=([^;]+)/)
  return match?.[1] === "en" ? "en" : "fr"
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { query, headers, body, raw, ...rest } = options
  const token = getAuthToken()
  const hadToken = Boolean(token)
  const requestHeaders: Record<string, string> = {
    "x-language": getLanguageHeader(),
    ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string> | undefined),
  }

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: requestHeaders,
    body:
      body instanceof FormData
        ? body
        : typeof body === "string" || body === undefined
          ? body
          : JSON.stringify(body),
  })

  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json") ? await response.json() : await response.text()

  // Déconnexion automatique si la session est invalide/expirée (token rejeté).
  const maybeHandleUnauthorized = (status: number, message?: string, errorCode?: number) => {
    if (isSessionUnauthorizedError(path, { status, errorCode, message, hadToken })) {
      handleSessionUnauthorized()
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "errorMsg" in payload
        ? String((payload as ApiEnvelope<unknown>).errorMsg ?? "")
        : undefined
    const errorCode =
      typeof payload === "object" && payload !== null && "errorCode" in payload
        ? Number((payload as ApiEnvelope<unknown>).errorCode ?? NaN)
        : undefined
    maybeHandleUnauthorized(response.status, message, Number.isFinite(errorCode) ? errorCode : undefined)
    throw new ApiClientError("API request failed", response.status, payload)
  }

  if (raw) return payload as T

  if (isApiEnvelope(payload)) {
    if (!payload.success) {
      maybeHandleUnauthorized(
        response.status,
        payload.errorMsg?.trim() || undefined,
        payload.errorCode ?? undefined,
      )
      throw new ApiClientError(
        payload.errorMsg?.trim() || "API request failed",
        response.status,
        payload,
        payload.errorCode ?? undefined,
      )
    }
    return payload.data as T
  }

  return payload as T
}
