import { GROVE_STORAGE_KEYS } from "@/lib/grovePersistence"

const syncKeys = Object.values(GROVE_STORAGE_KEYS).filter(
  (key) => key !== GROVE_STORAGE_KEYS.lastSession && key !== GROVE_STORAGE_KEYS.bootstrapDone
)
const syncIntervalMs = 1500

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

  const pull = async () => {
    try {
      const shared = await fetchSharedStorage()
      let changed = false

      for (const key of syncKeys) {
        const remoteValue = shared[key]
        if (typeof remoteValue !== "string") {
          if (initialized && knownValues.has(key)) {
            knownValues.delete(key)
            if (window.localStorage.getItem(key) !== null) {
              window.localStorage.removeItem(key)
              changed = true
            }
          }
          continue
        }

        knownValues.set(key, remoteValue)
        if (window.localStorage.getItem(key) !== remoteValue) {
          window.localStorage.setItem(key, remoteValue)
          changed = true
        }
      }

      if (changed) notifyRemoteChange()
    } catch {
      // The local cache remains usable when the server is temporarily unavailable.
    }
  }

  const pushLocalChanges = async () => {
    for (const key of syncKeys) {
      const value = window.localStorage.getItem(key)
      if (value === null) {
        if (!knownValues.has(key)) continue

        knownValues.delete(key)
        try {
          await deleteKey(key)
        } catch {
          knownValues.set(key, "deleted")
        }
        continue
      }

      if (knownValues.get(key) === value) continue

      knownValues.set(key, value)
      try {
        await publishKey(key, value)
      } catch {
        knownValues.delete(key)
      }
    }
  }

  const synchronize = async () => {
    if (stopped) return

    if (!initialized) {
      await pull()
      initialized = true
    }

    await pushLocalChanges()
    if (initialized) await pull()
  }

  void synchronize()
  const intervalId = window.setInterval(synchronize, syncIntervalMs)

  const stop = () => {
    stopped = true
    window.clearInterval(intervalId)
  }

  return stop
}