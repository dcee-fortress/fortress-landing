import { getGroveItem, setGroveItem } from "@/lib/groveClientStore"
import { shouldPublishSharedData } from "@/lib/liveDataConfig"
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"
import { emitSyncStatus } from "@/lib/syncStatus"
import {
  SHARED_STORAGE_KEYS,
  keepRicherRegistryValue,
  countRegistryProjects,
  slimProjectsRegistryValue,
  stampStorageUpdatedAt,
  STORAGE_UPDATED_AT_KEY,
  PROJECTS_REGISTRY_KEY,
} from "@/lib/sharedStorageMerge"

const groveKeySet = new Set(SHARED_STORAGE_KEYS)

export async function saveGroveKey(key, value, options = {}) {
  if (typeof window === "undefined") return value

  // Browser cache updates first so UI actions stick immediately.
  setGroveItem(key, value)
  markSharedStorageLocalWrite(key)

  if (!groveKeySet.has(key) || !shouldPublishSharedData()) {
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
        message:
          data.error ||
          "Postgres save failed. Your change is kept locally until sync succeeds.",
      })
      throw new Error(data.error || "Could not save to Postgres.")
    }

    const saved = typeof data.value === "string" ? data.value : payloadValue
    const nextValue =
      key === PROJECTS_REGISTRY_KEY ? keepRicherRegistryValue(value, saved) : saved

    if (
      key === PROJECTS_REGISTRY_KEY &&
      countRegistryProjects(nextValue) < countRegistryProjects(value)
    ) {
      emitSyncStatus({
        state: "offline",
        source: "Postgres",
        message: "Postgres did not keep the project. Try save again.",
      })
      throw new Error("Postgres did not keep the project.")
    }

    // A newer local edit may have landed while this request was in flight.
    // Never clobber that newer cache with a stale server response.
    const localNow = getGroveItem(key)
    if (localNow !== null && localNow !== value && localNow !== payloadValue) {
      emitSyncStatus({
        state: "synced",
        source: "Postgres",
        message: "Saved to Postgres",
        lastSync: new Date().toISOString(),
      })
      return localNow
    }

    setGroveItem(key, nextValue)
    markSharedStorageLocalWrite(key)
    if (typeof data.updatedAt === "string") {
      setGroveItem(STORAGE_UPDATED_AT_KEY, stampStorageUpdatedAt(data.updatedAt))
    }
    emitSyncStatus({
      state: "synced",
      source: "Postgres",
      message: "Saved to Postgres",
      lastSync: new Date().toISOString(),
    })
    return nextValue
  } catch (error) {
    emitSyncStatus({
      state: "offline",
      source: "Postgres",
      message: error instanceof Error ? error.message : "Postgres save failed.",
    })
    throw error
  }
}

export function writeGroveJson(key, object, options = {}) {
  return saveGroveKey(key, JSON.stringify(object), options)
}
