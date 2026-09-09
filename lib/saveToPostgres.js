import { isLiveCodeChannel } from "@/lib/liveDataConfig"
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"
import { emitSyncStatus } from "@/lib/syncStatus"
import {
  SHARED_STORAGE_KEYS,
  keepRicherRegistryValue,
  slimProjectsRegistryValue,
  stampStorageUpdatedAt,
  STORAGE_UPDATED_AT_KEY,
  PROJECTS_REGISTRY_KEY,
} from "@/lib/sharedStorageMerge"

const groveKeySet = new Set(SHARED_STORAGE_KEYS)

export async function saveGroveKey(key, value, options = {}) {
  if (typeof window === "undefined") return value

  window.localStorage.setItem(key, value)
  markSharedStorageLocalWrite(key)

  if (!groveKeySet.has(key) || !isLiveCodeChannel()) {
    return value
  }

  emitSyncStatus({ state: "syncing", source: "Postgres", message: "Saving to Postgres…" })

  try {
    const payloadValue =
      key === PROJECTS_REGISTRY_KEY ? slimProjectsRegistryValue(value) : value

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        value: payloadValue,
        replace: options.replace !== false,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      emitSyncStatus({
        state: "offline",
        source: "Postgres",
        message: data.error || "Postgres save failed. The project is kept on this device.",
      })
      return value
    }

    const saved = typeof data.value === "string" ? data.value : value
    const nextValue =
      key === PROJECTS_REGISTRY_KEY ? keepRicherRegistryValue(value, saved) : saved
    if (nextValue !== value) {
      window.localStorage.setItem(key, nextValue)
      markSharedStorageLocalWrite(key)
    }
    if (typeof data.updatedAt === "string") {
      window.localStorage.setItem(STORAGE_UPDATED_AT_KEY, stampStorageUpdatedAt(data.updatedAt))
    }
    emitSyncStatus({
      state: "synced",
      source: "Postgres",
      message: "Saved to Postgres",
      lastSync: new Date().toISOString(),
    })
    return nextValue
  } catch {
    emitSyncStatus({
      state: "offline",
      source: "Postgres",
      message: "Postgres save failed. The project is kept on this device.",
    })
    return value
  }
}

export function writeGroveJson(key, object, options = {}) {
  return saveGroveKey(key, JSON.stringify(object), options)
}
