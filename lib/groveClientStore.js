/**
 * In-memory client cache for Grove shared keys.
 * Supabase Postgres is the source of truth (via /api + `pg`).
 * sessionStorage keeps a short-lived snapshot so localhost reloads paint instantly.
 */

const store = new Map()
const listeners = new Set()
const SESSION_CACHE_KEY = "grove-client-store-v1"
const SESSION_CACHE_MAX_CHARS = 4_500_000

/** Persist these first so valuations/material schedules survive reload. */
const PRIORITY_SESSION_KEYS = [
  "grove-projects-registry",
  "grove-deleted-project-ids",
  "grove-storage-updated-at",
  "grove-primary-project-data",
  "grove-material-schedules",
  "grove-material-schedule-drafts",
  "grove-petty-cash",
  "grove-goods-received",
  "grove-ppe-received",
  "grove-ppe-issued",
  "grove-induction-registers",
  "grove-sheq-site-inspection",
  "grove-sheq-incident",
  "grove-sheq-weekly-report",
  "grove-sheq-home-alerts",
  "grove-file-trash",
  "grove-site-staff-registers",
]

function emit(key) {
  for (const listener of listeners) {
    try {
      listener(key)
    } catch {
      // Ignore listener failures so one bad subscriber cannot break writes.
    }
  }
}

function persistSessionSnapshot() {
  if (typeof window === "undefined") return
  try {
    const snapshot = {}
    let total = 2

    const writeKey = (key, value) => {
      if (typeof value !== "string") return
      const size = key.length + value.length + 8
      if (total + size > SESSION_CACHE_MAX_CHARS) return false
      snapshot[key] = value
      total += size
      return true
    }

    for (const key of PRIORITY_SESSION_KEYS) {
      if (store.has(key)) writeKey(key, store.get(key))
    }

    for (const [key, value] of store.entries()) {
      if (PRIORITY_SESSION_KEYS.includes(key)) continue
      writeKey(key, value)
    }

    window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // Quota or private mode — ignore.
  }
}

let persistTimer = 0
function schedulePersistSessionSnapshot() {
  if (typeof window === "undefined") return
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(persistSessionSnapshot, 250)
}

export function hydrateGroveStoreFromSession() {
  if (typeof window === "undefined") return false
  if (store.size > 0) return true
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return false
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === "string" && typeof value === "string") {
        store.set(key, value)
      }
    }
    return store.size > 0
  } catch {
    return false
  }
}

export function getGroveItem(key) {
  if (typeof key !== "string") return null
  return store.has(key) ? store.get(key) : null
}

export function setGroveItem(key, value) {
  if (typeof key !== "string") return
  const next = value == null ? "" : String(value)
  store.set(key, next)
  emit(key)
  schedulePersistSessionSnapshot()
}

export function removeGroveItem(key) {
  if (typeof key !== "string") return
  if (!store.has(key)) return
  store.delete(key)
  emit(key)
  schedulePersistSessionSnapshot()
}

export function clearGroveItems(keys = null) {
  if (Array.isArray(keys)) {
    for (const key of keys) removeGroveItem(key)
    return
  }
  store.clear()
  emit(null)
  schedulePersistSessionSnapshot()
}

export function readGroveSnapshot(keys) {
  const snapshot = {}
  for (const key of keys) {
    if (store.has(key)) snapshot[key] = store.get(key)
  }
  return snapshot
}

export function subscribeGroveStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof window !== "undefined") {
  hydrateGroveStoreFromSession()
}
