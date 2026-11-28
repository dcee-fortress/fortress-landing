/**
 * Offline-first helpers for Rodcroft:
 * - durable pending write queue (survives reloads)
 * - per-key client edit timestamps for last-write-wins
 * - fast online/offline checks
 */

import { readOnline } from "@/components/fortress/offline"

const EDIT_TIMES_KEY = "grove-client-edit-times-v1"
const PENDING_QUEUE_KEY = "grove-offline-pending-v1"

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota — keep running from memory.
  }
}

/** True when the device reports offline (airplane mode / no signal). */
export function isDeviceOffline() {
  return !readOnline()
}

/** Short AbortSignal for online fetches; null offline so callers can skip. */
export function syncFetchSignal(ms = 8_000) {
  if (isDeviceOffline()) return null
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms)
  }
  return undefined
}

export function stampClientEdit(key, iso = new Date().toISOString()) {
  if (!key || typeof window === "undefined") return iso
  const times = readJson(EDIT_TIMES_KEY, {})
  times[key] = iso
  writeJson(EDIT_TIMES_KEY, times)
  return iso
}

export function getClientEditTime(key) {
  if (!key) return 0
  const times = readJson(EDIT_TIMES_KEY, {})
  return Date.parse(times[key] || "") || 0
}

export function clearClientEdit(key) {
  if (!key || typeof window === "undefined") return
  const times = readJson(EDIT_TIMES_KEY, {})
  if (!(key in times)) return
  delete times[key]
  writeJson(EDIT_TIMES_KEY, times)
}

export function listPendingClientEdits() {
  const times = readJson(EDIT_TIMES_KEY, {})
  return Object.entries(times)
    .map(([key, iso]) => ({ key, at: Date.parse(iso) || 0, iso }))
    .filter((row) => row.at > 0)
}

/** Queue a key for later Postgres / shared-storage publish. */
export function enqueueOfflineWrite(key, value, options = {}) {
  if (!key || typeof window === "undefined") return
  const queue = readJson(PENDING_QUEUE_KEY, {})
  queue[key] = {
    value: value == null ? "" : String(value),
    options: { replace: options.replace !== false },
    editedAt: new Date().toISOString(),
  }
  writeJson(PENDING_QUEUE_KEY, queue)
  stampClientEdit(key, queue[key].editedAt)
}

export function readOfflineQueue() {
  return readJson(PENDING_QUEUE_KEY, {})
}

export function dequeueOfflineWrite(key) {
  if (!key || typeof window === "undefined") return
  const queue = readJson(PENDING_QUEUE_KEY, {})
  if (!(key in queue)) return
  delete queue[key]
  writeJson(PENDING_QUEUE_KEY, queue)
}

export function clearOfflineQueue() {
  writeJson(PENDING_QUEUE_KEY, {})
}

export function hasOfflineQueue() {
  return Object.keys(readOfflineQueue()).length > 0
}

/**
 * Last-write-wins: local wins when its edit time is strictly newer than remote.
 * Equal timestamps prefer remote (server already has that revision).
 */
export function localWinsLastWrite(localEditedAtMs, remoteUpdatedAtMs) {
  if (!localEditedAtMs) return false
  if (!remoteUpdatedAtMs) return true
  return localEditedAtMs > remoteUpdatedAtMs
}

/**
 * Publish every queued offline write to Postgres (last queued value per key wins).
 * Safe to call when back online after airplane mode.
 */
export async function flushOfflineQueueToLive() {
  if (typeof window === "undefined") return { flushed: 0 }
  if (isDeviceOffline()) return { flushed: 0, offline: true }

  const queue = readOfflineQueue()
  const keys = Object.keys(queue)
  if (keys.length === 0) return { flushed: 0 }

  const { saveGroveKey } = await import("@/lib/saveToPostgres")
  let flushed = 0
  for (const key of keys) {
    const entry = queue[key]
    if (!entry) continue
    try {
      await saveGroveKey(key, entry.value, {
        ...(entry.options || { replace: true }),
        awaitFlush: true,
      })
      if (!isDeviceOffline()) flushed += 1
    } catch {
      // Leave the key queued for the next reconnect.
    }
  }
  emitOfflineSyncEvent({ state: "flushed", flushed })
  return { flushed }
}

export function emitOfflineSyncEvent(detail = {}) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("grove-offline-sync", { detail }))
}
