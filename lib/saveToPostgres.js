import { getGroveItem, setGroveItem } from "@/lib/groveClientStore"
import { shouldPublishSharedData } from "@/lib/liveDataConfig"
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"
import { emitSyncStatus } from "@/lib/syncStatus"
import {
  SHARED_STORAGE_KEYS,
  SNAPSHOT_STORAGE_KEYS,
  keepRicherRegistryValue,
  countRegistryProjects,
  slimProjectsRegistryValue,
  stampStorageUpdatedAt,
  STORAGE_UPDATED_AT_KEY,
  PROJECTS_REGISTRY_KEY,
  mergeSharedStorageValue,
} from "@/lib/sharedStorageMerge"

const groveKeySet = new Set(SHARED_STORAGE_KEYS)

/** Latest pending payload per key — collapses rapid autosaves into one network write. */
const pendingByKey = new Map()
const inflightByKey = new Map()

async function publishKeyToPostgres(key, value, options = {}) {
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
    return null
  }

  const saved = typeof data.value === "string" ? data.value : payloadValue
  const nextValue =
    key === PROJECTS_REGISTRY_KEY
      ? keepRicherRegistryValue(value, saved)
      : SNAPSHOT_STORAGE_KEYS.has(key)
        ? mergeSharedStorageValue(key, value, saved)
        : saved

  if (
    key === PROJECTS_REGISTRY_KEY &&
    countRegistryProjects(nextValue) < countRegistryProjects(value)
  ) {
    emitSyncStatus({
      state: "offline",
      source: "Postgres",
      message: "Postgres did not keep the project. Try save again.",
    })
    return null
  }

  return { nextValue, payloadValue, updatedAt: data.updatedAt }
}

async function flushKey(key) {
  while (pendingByKey.has(key)) {
    const { value, options } = pendingByKey.get(key)
    pendingByKey.delete(key)

    try {
      const result = await publishKeyToPostgres(key, value, options)
      if (!result) continue

      const localNow = getGroveItem(key)
      if (
        localNow !== null &&
        localNow !== value &&
        localNow !== result.payloadValue
      ) {
        // A newer local edit landed — loop will publish the pending one.
        continue
      }

      if (typeof result.nextValue === "string") {
        setGroveItem(key, result.nextValue)
        markSharedStorageLocalWrite(key)
      }
      if (typeof result.updatedAt === "string") {
        setGroveItem(STORAGE_UPDATED_AT_KEY, stampStorageUpdatedAt(result.updatedAt))
      }
      emitSyncStatus({
        state: "synced",
        source: "Postgres",
        message: "Saved to Postgres",
        lastSync: new Date().toISOString(),
      })
    } catch (error) {
      emitSyncStatus({
        state: "offline",
        source: "Postgres",
        message: error instanceof Error ? error.message : "Postgres save failed.",
      })
    }
  }
}

export async function saveGroveKey(key, value, options = {}) {
  if (typeof window === "undefined") return value

  // Browser cache updates first so UI actions stick immediately.
  setGroveItem(key, value)
  markSharedStorageLocalWrite(key)

  if (!groveKeySet.has(key) || !shouldPublishSharedData()) {
    return value
  }

  emitSyncStatus({ state: "syncing", source: "Postgres", message: "Saving to Postgres…" })

  pendingByKey.set(key, { value, options })
  if (inflightByKey.has(key)) {
    return value
  }

  const run = flushKey(key).finally(() => {
    inflightByKey.delete(key)
    if (pendingByKey.has(key)) {
      const next = flushKey(key).finally(() => inflightByKey.delete(key))
      inflightByKey.set(key, next)
    }
  })
  inflightByKey.set(key, run)

  return value
}

export function writeGroveJson(key, object, options = {}) {
  return saveGroveKey(key, JSON.stringify(object), options)
}
