import { ensureAllActiveProjectsDailyFiles } from "@/lib/dailyFileSync"
import { GROVE_STORAGE_KEYS } from "@/lib/grovePersistence"
import { invalidateGroveCaches } from "@/lib/invalidateGroveCaches"
import {
  DELETED_PROJECT_IDS_KEY,
  mergeSharedStorageValue,
  PROJECTS_REGISTRY_KEY,
  purgeDeletedProjectsFromStorage,
  stripDemoSharedValue,
} from "@/lib/sharedStorageMerge"
import {
  markSharedStorageLocalWrite,
  wasRecentlyWrittenLocally,
} from "@/lib/sharedStorageGuard"

const syncKeys = Object.values(GROVE_STORAGE_KEYS).filter(
  (key) => key !== GROVE_STORAGE_KEYS.lastSession && key !== GROVE_STORAGE_KEYS.bootstrapDone
)
const syncKeySet = new Set(syncKeys)
const syncIntervalMs = 4000
const writeDebounceMs = 400

const persistenceControl = {
  applySnapshot: null,
}

function notifyRemoteChange() {
  invalidateGroveCaches()
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

async function publishKey(key, value, options = {}) {
  const response = await fetch("/api/shared-storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, replace: options.replace === true }),
  })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  const data = await response.json().catch(() => ({}))
  return typeof data.value === "string" ? data.value : value
}

async function replaceRemoteStorage(storage) {
  const response = await fetch("/api/shared-storage", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ replace: true, storage }),
  })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  const data = await response.json().catch(() => ({}))
  return data.storage && typeof data.storage === "object" ? data.storage : storage
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
  let applyingRemote = false
  let writeTimer = 0
  let syncing = false
  let resolveReady = () => {}
  const ready = new Promise((resolve) => {
    resolveReady = resolve
  })
  const knownValues = new Map()
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage)

  const setLocalValue = (key, value) => {
    applyingRemote = true
    try {
      originalSetItem(key, value)
    } finally {
      applyingRemote = false
    }
  }

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

        const liveValue = stripDemoSharedValue(remoteValue)
        const keepTombstones = key === PROJECTS_REGISTRY_KEY || key === DELETED_PROJECT_IDS_KEY
        const nextValue = keepTombstones
          ? mergeSharedStorageValue(key, localValue, liveValue)
          : liveValue
        if (nextValue !== localValue) {
          setLocalValue(key, nextValue)
          changed = true
        }
        knownValues.set(key, nextValue)
        if (keepTombstones && nextValue !== liveValue) {
          try {
            await publishKey(key, nextValue, { replace: true })
            markSharedStorageLocalWrite(key)
            knownValues.set(key, nextValue)
          } catch {
            knownValues.set(key, `${nextValue}-pending`)
          }
        }
      }

      const snapshot = {}
      for (const key of syncKeys) {
        const value = window.localStorage.getItem(key)
        if (value !== null) snapshot[key] = value
      }
      const purged = purgeDeletedProjectsFromStorage(snapshot)
      for (const key of syncKeys) {
        if (typeof purged[key] === "string" && purged[key] !== snapshot[key]) {
          setLocalValue(key, purged[key])
          knownValues.set(key, purged[key])
          changed = true
        }
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
          setLocalValue(key, published)
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
    if (stopped || syncing) return
    syncing = true

    try {
      if (!initialized) {
        await pull({ ensureCalendar: true })
        initialized = true
        await pushLocalChanges()
        notifyRemoteChange()
        resolveReady()
        return
      }

      const pushedKeys = await pushLocalChanges()
      await pull({ skipKeys: pushedKeys })
    } finally {
      syncing = false
      if (initialized) resolveReady()
    }
  }

  window.localStorage.setItem = (key, value) => {
    originalSetItem(key, value)
    if (!applyingRemote && syncKeySet.has(String(key))) {
      window.clearTimeout(writeTimer)
      writeTimer = window.setTimeout(() => {
        void synchronize()
      }, writeDebounceMs)
    }
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") void synchronize()
  }
  document.addEventListener("visibilitychange", onVisible)
  window.addEventListener("focus", onVisible)

  persistenceControl.applySnapshot = (storage = {}) => {
    for (const key of syncKeys) {
      const value = storage[key]
      if (typeof value === "string") {
        setLocalValue(key, value)
        knownValues.set(key, value)
        markSharedStorageLocalWrite(key)
      } else {
        applyingRemote = true
        try {
          window.localStorage.removeItem(key)
        } finally {
          applyingRemote = false
        }
        knownValues.delete(key)
      }
    }
    notifyRemoteChange()
  }

  void synchronize()
  const intervalId = window.setInterval(synchronize, syncIntervalMs)

  const stop = () => {
    stopped = true
    window.clearInterval(intervalId)
    window.clearTimeout(writeTimer)
    document.removeEventListener("visibilitychange", onVisible)
    window.removeEventListener("focus", onVisible)
    window.localStorage.setItem = originalSetItem
  }

  stop.ready = ready
  return stop
}

export async function replaceLiveSharedStorage(storage) {
  const remote = await replaceRemoteStorage(storage)
  if (persistenceControl.applySnapshot) {
    persistenceControl.applySnapshot(remote)
  }
  return remote
}

export async function publishSharedKeys(options = {}) {
  const replace = options.replace === true
  for (const key of syncKeys) {
    const value = window.localStorage.getItem(key)
    if (value === null) continue
    await publishKey(key, value, { replace })
    markSharedStorageLocalWrite(key)
  }
}
