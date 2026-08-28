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
  await fetch("/api/shared-storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
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
        if (typeof remoteValue !== "string") continue

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
      if (value === null || knownValues.get(key) === value) continue

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