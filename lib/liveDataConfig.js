export const LIVE_SHARED_STORAGE_URL =
  process.env.GROVE_LIVE_DATA_URL ||
  "https://rodcroft-fortress.vercel.app/api/shared-storage"

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
  // Local Next.js publishes browser data to the live Vercel store.
  return !process.env.VERCEL
}

export function isLiveCodeChannel() {
  return process.env.NEXT_PUBLIC_GROVE_CODE_CHANNEL === "live"
}

export function isLocalCodeChannel() {
  return !isLiveCodeChannel()
}
