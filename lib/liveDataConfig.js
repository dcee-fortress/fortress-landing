/** Canonical live app + Supabase project (pojvxqjjoupwjchncbro). */
export const LIVE_APP_ORIGIN =
  process.env.GROVE_LIVE_ORIGIN?.replace(/\/$/, "") ||
  "https://rodcroft-fortress.vercel.app"

export const LIVE_SHARED_STORAGE_URL =
  process.env.GROVE_LIVE_DATA_URL || `${LIVE_APP_ORIGIN}/api/shared-storage`

/** Live Rodcroft data is stored in this Supabase Postgres project. */
export const SUPABASE_LIVE = {
  projectRef: "pojvxqjjoupwjchncbro",
  table: "grove_shared_storage",
  liveUrl: LIVE_APP_ORIGIN,
  dashboardUrl: "https://supabase.com/dashboard/project/pojvxqjjoupwjchncbro",
}

export const LIVE_SYNC_TIMEOUT_MS = 8_000

const ALLOWED_LIVE_ENDPOINTS = new Set(["shared-storage", "site-weather", "projects"])

function hasSupabaseEnv() {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DIRECT_URL
  )
}

export function liveSyncOrigins() {
  const fromEnv = process.env.GROVE_LIVE_ORIGIN?.replace(/\/$/, "")
  const fromStorageUrl = (() => {
    try {
      return new URL(LIVE_SHARED_STORAGE_URL).origin
    } catch {
      return null
    }
  })()

  return [
    ...new Set(
      [
        fromEnv,
        LIVE_APP_ORIGIN,
        "https://rodcroft-fortress.vercel.app",
        "https://fortress-landing-iota.vercel.app",
        "https://rodcroft.vercel.app",
        fromStorageUrl,
      ].filter(Boolean)
    ),
  ]
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

/**
 * Pull-only mode: used when this process has no Supabase credentials.
 * When DATABASE_URL / POSTGRES_* are set (local or Vercel), Supabase is primary and we write to it.
 */
export function shouldSyncLiveData() {
  const flag = process.env.GROVE_SYNC_LIVE_DATA
  if (flag === "0" || flag === "false") return false
  if (flag === "1" || flag === "true") return true
  if (hasSupabaseEnv()) return false
  return !process.env.VERCEL
}

export function isLiveCodeChannel() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host === "localhost" || host === "127.0.0.1") return false
    if (host.endsWith(".vercel.app") || host.includes("rodcroft") || host.includes("fortress")) {
      return true
    }
  }
  return (
    process.env.NEXT_PUBLIC_GROVE_CODE_CHANNEL === "live" || Boolean(process.env.VERCEL)
  )
}

/**
 * Browser never owns data — it only caches after Supabase accepts a write.
 * Both localhost and the live site publish through /api → Supabase.
 */
export function shouldPublishSharedData() {
  return typeof window !== "undefined"
}

export function isLocalCodeChannel() {
  return !isLiveCodeChannel()
}
