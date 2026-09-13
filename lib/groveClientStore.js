/**
 * In-memory client cache for Grove shared keys.
 * Supabase Postgres is the source of truth (via /api + `pg`).
 * This Map is only an in-memory browser cache — never localStorage.
 */

const store = new Map()
const listeners = new Set()

function emit(key) {
  for (const listener of listeners) {
    try {
      listener(key)
    } catch {
      // Ignore listener failures so one bad subscriber cannot break writes.
    }
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
}

export function removeGroveItem(key) {
  if (typeof key !== "string") return
  if (!store.has(key)) return
  store.delete(key)
  emit(key)
}

export function clearGroveItems(keys = null) {
  if (Array.isArray(keys)) {
    for (const key of keys) removeGroveItem(key)
    return
  }
  store.clear()
  emit(null)
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
