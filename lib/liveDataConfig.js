export const LIVE_SHARED_STORAGE_URL =
  process.env.GROVE_LIVE_DATA_URL ||
  "https://rodcroft-fortress.vercel.app/api/shared-storage"

/** Live Rodcroft data is stored in Supabase Postgres. */
export const SUPABASE_LIVE = {
  table: "grove_shared_storage",
  liveUrl: "https://rodcroft-fortress.vercel.app",
}

export const LIVE_SYNC_TIMEOUT_MS = 8_000

const ALLOWED_LIVE_ENDPOINTS = new Set(["shared-storage", "site-weather", "projects"])

export function liveSyncOrigins() {
  const fromEnv = process.env.GROVE_LIVE_ORIGIN?.replace(/\/$/, "")
  const fromStorageUrl = (() => {
    try {
      return new URL(LIVE_SHARED_STORAGE_URL).origin
    } catch {
      return null
    }
  })()

  return [...new Set([fromEnv, "https://rodcroft.vercel.app", fromStorageUrl].filter(Boolean))]
}

export function resolveLiveSyncPath(endpoint) {
  const slug = typeof endpoint === "string" && endpoint.trim() ? endpoint.trim() : "shared-storage"
  if (!ALLOWED_LIVE_ENDPOINTS.has(slug)) return null
  return `/api/${slug}`
}

export function liveSyncHeaders() {
  const headers = { Accept: "application/json" }
  const token = process.env.GROVE_LIVE_SYNC_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export function shouldSyncLiveData() {
  const flag = process.env.GROVE_SYNC_LIVE_DATA
  if (flag === "0" || flag === "false") return false
  if (flag === "1" || flag === "true") return true
  // Local Next.js only pulls from live Postgres. It must not write over it.
  return !process.env.VERCEL
}

export function isLiveCodeChannel() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host === "localhost" || host === "127.0.0.1") return false
    if (host.endsWith(".vercel.app") || host.includes("rodcroft")) return true
  }
  return (
    process.env.NEXT_PUBLIC_GROVE_CODE_CHANNEL === "live" || Boolean(process.env.VERCEL)
  )
}

/** Only the live website writes to Postgres. Localhost reads after that write. */
export function shouldPublishSharedData() {
  return typeof window !== "undefined" && isLiveCodeChannel()
}

export function isLocalCodeChannel() {
  return !isLiveCodeChannel()
}
