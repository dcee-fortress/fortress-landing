import { ensureAllActiveProjectsDailyFiles } from "@/lib/dailyFileSync"
import { GROVE_STORAGE_KEYS } from "@/lib/grovePersistence"
import { mergeSharedStorageValue } from "@/lib/sharedStorageMerge"
import {
  markSharedStorageLocalWrite,
  wasRecentlyWrittenLocally,
} from "@/lib/sharedStorageGuard"

const syncKeys = Object.values(GROVE_STORAGE_KEYS).filter(
  (key) => key !== GROVE_STORAGE_KEYS.lastSession && key !== GROVE_STORAGE_KEYS.bootstrapDone
)
const syncIntervalMs = 10000

function notifyRemoteChange() {
  window.dispatchEvent(new Event("grove-shared-storage-change"))
}

async function fetchSharedStorage() {
  const response = await fetch("/api/shared-storage", { cache: "no-store" })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  const data = await response.json()
  if (data?.error && typeof data.error === "string" && !("grove-projects-registry" in data)) {
    throw new Error(data.error)
  }
  return data
}

async function publishKey(key, value) {
  const response = await fetch("/api/shared-storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  const data = await response.json().catch(() => ({}))
  return typeof data.value === "string" ? data.value : value
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
    const ensureCalendar = options.ensureCalendar === true

    try {
      const shared = await fetchSharedStorage()
      let changed = false

      for (const key of syncKeys) {
        if (skipKeys.has(key) || wasRecentlyWrittenLocally(key)) {
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
          continue
        }

        const mergedValue = mergeSharedStorageValue(key, localValue, remoteValue)
        if (mergedValue !== localValue) {
          window.localStorage.setItem(key, mergedValue)
          changed = true
        }
        knownValues.set(key, remoteValue)
      }

      const calendarChanged = ensureCalendar ? ensureAllActiveProjectsDailyFiles() : false
      if (changed || calendarChanged) notifyRemoteChange()
    } catch {
      // The local cache remains usable when the server is temporarily unavailable.
    }
  }

  const pushLocalChanges = async () => {
    const pushedKeys = new Set()
    let mergedFromServer = false

    for (const key of syncKeys) {
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
        const published = await publishKey(key, value)
        if (published !== value) {
          window.localStorage.setItem(key, published)
          mergedFromServer = true
        }
        knownValues.set(key, published)
        markSharedStorageLocalWrite(key)
        pushedKeys.add(key)
      } catch {
        // Keep the local value queued for the next sync attempt.
      }
    }

    if (mergedFromServer) notifyRemoteChange()
    return pushedKeys
  }

  const synchronize = async () => {
    if (stopped) return

    if (!initialized) {
      await pull({ ensureCalendar: true })
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
