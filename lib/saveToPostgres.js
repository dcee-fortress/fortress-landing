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

  if (!groveKeySet.has(key) || !shouldPublishSharedData()) {
    window.localStorage.setItem(key, value)
    markSharedStorageLocalWrite(key)
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
        message: data.error || "Postgres save failed. Nothing was cached until Postgres accepts it.",
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

    window.localStorage.setItem(key, nextValue)
    markSharedStorageLocalWrite(key)
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
