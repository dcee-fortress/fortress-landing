import { ensureAllActiveProjectsDailyFiles } from "@/lib/dailyFileSync"
import { GROVE_STORAGE_KEYS } from "@/lib/grovePersistence"
import {
  markSharedStorageLocalWrite,
  wasRecentlyWrittenLocally,
} from "@/lib/sharedStorageGuard"

const syncKeys = Object.values(GROVE_STORAGE_KEYS).filter(
  (key) => key !== GROVE_STORAGE_KEYS.lastSession && key !== GROVE_STORAGE_KEYS.bootstrapDone
)
const syncIntervalMs = 10000

const DEV_LOCAL_ONLY_KEYS = new Set([
  GROVE_STORAGE_KEYS.projectData,
  GROVE_STORAGE_KEYS.materialSchedules,
  GROVE_STORAGE_KEYS.materialScheduleDrafts,
])

function shouldSyncKey(key) {
  if (process.env.NODE_ENV === "development" && DEV_LOCAL_ONLY_KEYS.has(key)) {
    return false
  }

  return true
}

function notifyRemoteChange() {
  window.dispatchEvent(new Event("grove-shared-storage-change"))
}

async function fetchSharedStorage() {
  const response = await fetch("/api/shared-storage", { cache: "no-store" })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  return response.json()
}

async function publishKey(key, value) {
  const response = await fetch("/api/shared-storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
  if (!response.ok) throw new Error("Shared storage is unavailable")
}

async function deleteKey(key) {
  const response = await fetch("/api/shared-storage", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  })
  if (!response.ok) throw new Error("Shared storage is unavailable")
}

export function startSharedPersistence() {
  if (typeof window === "undefined") return () => {}

  let stopped = false
  let initialized = false
  const knownValues = new Map()

  const pull = async (options = {}) => {
    const skipKeys = options.skipKeys ?? new Set()

    try {
      const shared = await fetchSharedStorage()
      let changed = false

      for (const key of syncKeys) {
        if (!shouldSyncKey(key) || skipKeys.has(key) || wasRecentlyWrittenLocally(key)) {
          continue
        }

        const remoteValue = shared[key]
        const localValue = window.localStorage.getItem(key)

        if (
          initialized &&
          localValue !== null &&
          knownValues.has(key) &&
          knownValues.get(key) !== localValue
        ) {
          continue
        }

        if (typeof remoteValue !== "string") {
          if (initialized && knownValues.has(key)) {
            knownValues.delete(key)
            if (localValue !== null) {
              window.localStorage.removeItem(key)
              changed = true
            }
          }
          continue
        }

        if (localValue !== remoteValue) {
          window.localStorage.setItem(key, remoteValue)
          changed = true
        }
        knownValues.set(key, remoteValue)
      }

      const calendarChanged = ensureAllActiveProjectsDailyFiles()
      if (changed || calendarChanged) notifyRemoteChange()
    } catch {
      // The local cache remains usable when the server is temporarily unavailable.
    }
  }

  const pushLocalChanges = async () => {
    const pushedKeys = new Set()

    for (const key of syncKeys) {
      if (!shouldSyncKey(key)) continue

      const value = window.localStorage.getItem(key)
      if (value === null) {
        if (!knownValues.has(key)) continue

        knownValues.delete(key)
        try {
          await deleteKey(key)
          pushedKeys.add(key)
        } catch {
          knownValues.set(key, "deleted")
        }
        continue
      }

      if (knownValues.get(key) === value) continue

      try {
        await publishKey(key, value)
        knownValues.set(key, value)
        markSharedStorageLocalWrite(key)
        pushedKeys.add(key)
      } catch {
        // Keep the local value queued for the next sync attempt.
      }
    }

    return pushedKeys
  }

  const synchronize = async () => {
    if (stopped) return

    if (!initialized) {
      await pull()
      initialized = true
      const pushedKeys = await pushLocalChanges()
      return
    }

    const pushedKeys = await pushLocalChanges()
    await pull({ skipKeys: pushedKeys })
  }

  void synchronize()
  const intervalId = window.setInterval(synchronize, syncIntervalMs)

  const stop = () => {
    stopped = true
    window.clearInterval(intervalId)
  }

  return stop
}
