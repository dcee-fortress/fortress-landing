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
import { readResponseJson } from "@/lib/safeJson"

const SNAPSHOT_PUBLISH_KEYS = new Set([
  GROVE_STORAGE_KEYS.projectData,
  GROVE_STORAGE_KEYS.materialSchedules,
  GROVE_STORAGE_KEYS.materialScheduleDrafts,
  GROVE_STORAGE_KEYS.boq,
  GROVE_STORAGE_KEYS.boqDescriptionMemory,
  GROVE_STORAGE_KEYS.plantCost,
  GROVE_STORAGE_KEYS.plantHours,
  GROVE_STORAGE_KEYS.equipmentHours,
  GROVE_STORAGE_KEYS.plantOperatorRegisters,
])
const syncKeys = Object.values(GROVE_STORAGE_KEYS).filter(
  (key) => key !== GROVE_STORAGE_KEYS.lastSession && key !== GROVE_STORAGE_KEYS.bootstrapDone
)
const syncKeySet = new Set(syncKeys)
const syncIntervalMs = 2000
const writeDebounceMs = 250

const persistenceControl = {
  applySnapshot: null,
  pending: false,
}

let sharedPersistenceReady = Promise.resolve()

export function getSharedPersistenceReady() {
  return sharedPersistenceReady
}

function notifyRemoteChange() {
  invalidateGroveCaches()
  window.dispatchEvent(new Event("grove-shared-storage-change"))
}

async function fetchSharedStorage() {
  const response = await fetch("/api/shared-storage", { cache: "no-store" })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  const data = await readResponseJson(response, {})
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
  const data = await readResponseJson(response, {})
  return typeof data.value === "string" ? data.value : value
}

async function replaceRemoteStorage(storage) {
  const response = await fetch("/api/shared-storage", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ replace: true, storage }),
  })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  const data = await readResponseJson(response, {})
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
    invalidateGroveCaches()
  }

  const pull = async (options = {}) => {
    const skipKeys = options.skipKeys ?? new Set()
    const ensureCalendar = options.ensureCalendar === true
    const remoteWins = options.remoteWins === true

    try {
      const shared = await fetchSharedStorage()
      let changed = false

      for (const key of syncKeys) {
        if (skipKeys.has(key)) continue
        if (wasRecentlyWrittenLocally(key)) continue

        const remoteValue = shared[key]
        const localValue = window.localStorage.getItem(key)

        if (
          !remoteWins &&
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
        const nextValue =
          keepTombstones && !remoteWins
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

      invalidateGroveCaches()
      const calendarChanged = ensureCalendar ? ensureAllActiveProjectsDailyFiles() : false
      if (changed || calendarChanged) notifyRemoteChange()
      return true
    } catch {
      // The local cache remains usable when the server is temporarily unavailable.
      return false
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
        const published = await publishKey(key, value, {
          replace: SNAPSHOT_PUBLISH_KEYS.has(key),
        })
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
    if (stopped) return
    if (syncing) {
      persistenceControl.pending = true
      return
    }
    syncing = true

    try {
      do {
        persistenceControl.pending = false

        if (!initialized) {
          const pulled = await pull({ ensureCalendar: true, remoteWins: true })
          if (!pulled) {
            resolveReady()
            break
          }
          initialized = true
          const pushedKeys = await pushLocalChanges()
          if (pushedKeys.size > 0) notifyRemoteChange()
          resolveReady()
          continue
        }

        const pendingKeys = new Set()
        for (const key of syncKeys) {
          const value = window.localStorage.getItem(key)
          if (value !== null && knownValues.get(key) !== value) pendingKeys.add(key)
          if (value === null && knownValues.has(key)) pendingKeys.add(key)
        }

        await pull({ skipKeys: pendingKeys })
        const pushedKeys = await pushLocalChanges()
        if (pushedKeys.size > 0) notifyRemoteChange()
      } while (persistenceControl.pending && !stopped)
    } finally {
      syncing = false
      if (initialized) resolveReady()
    }
  }

  window.localStorage.setItem = (key, value) => {
    originalSetItem(key, value)
    if (!applyingRemote && syncKeySet.has(String(key))) {
      markSharedStorageLocalWrite(String(key))
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

  sharedPersistenceReady = ready
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
