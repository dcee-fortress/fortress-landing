import { ensureAllActiveProjectsDailyFiles } from "@/lib/dailyFileSync"
import { GROVE_STORAGE_KEYS } from "@/lib/grovePersistence"
import { invalidateGroveCaches } from "@/lib/invalidateGroveCaches"
import {
  DELETED_PROJECT_IDS_KEY,
  collectDeletedProjectIds,
  mergeSharedStorageValue,
  PROJECTS_REGISTRY_KEY,
  purgeDeletedProjectsFromStorage,
  reconcileLiveProjectsWithTombstones,
  scoreSharedStorage,
  slimProjectsRegistryValue,
  stripDemoSharedValue,
} from "@/lib/sharedStorageMerge"
import {
  markSharedStorageLocalWrite,
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
const syncIntervalMs = 4000
const writeDebounceMs = 400
const USER_EDIT_GRACE_MS = 2000

const persistenceControl = {
  applySnapshot: null,
  pending: false,
}

let sharedPersistenceReady = Promise.resolve()
let systemWriteDepth = 0
const lastUserEditAt = new Map()

export function getSharedPersistenceReady() {
  return sharedPersistenceReady
}

export function runSystemStorageWrite(fn) {
  systemWriteDepth += 1
  try {
    return fn()
  } finally {
    systemWriteDepth -= 1
  }
}

function isSystemStorageWrite() {
  return systemWriteDepth > 0
}

function hasPendingUserEdit(key) {
  const editedAt = lastUserEditAt.get(key)
  if (!editedAt) return false
  return Date.now() - editedAt < USER_EDIT_GRACE_MS
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
      try {
        originalSetItem(key, value)
      } catch {
        if (key === PROJECTS_REGISTRY_KEY) {
          originalSetItem(key, slimProjectsRegistryValue(value))
        } else {
          throw new Error("localStorage write failed")
        }
      }
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
      const shared = reconcileLiveProjectsWithTombstones(await fetchSharedStorage())
      let changed = false

      const localSnapshot = {}
      for (const key of syncKeys) {
        const value = window.localStorage.getItem(key)
        if (value !== null) localSnapshot[key] = value
      }

      const liveDeleted = new Set(collectDeletedProjectIds(shared))
      const localRegistryRaw = localSnapshot[PROJECTS_REGISTRY_KEY]
      let localHasRestorableProject = false
      if (typeof localRegistryRaw === "string") {
        try {
          const parsed = JSON.parse(localRegistryRaw)
          localHasRestorableProject = (parsed.projects ?? []).some(
            (project) => project?.id && !liveDeleted.has(project.id)
          )
        } catch {
          localHasRestorableProject = false
        }
      }

      const shouldSeedLive =
        scoreSharedStorage(localSnapshot) > scoreSharedStorage(shared) && localHasRestorableProject

      if (shouldSeedLive) {
        for (const key of syncKeys) {
          if (typeof localSnapshot[key] !== "string") continue
          lastUserEditAt.set(key, Date.now())
          knownValues.set(key, `${localSnapshot[key]}-pending-seed`)
        }
        invalidateGroveCaches()
        return true
      }

      for (const key of syncKeys) {
        if (skipKeys.has(key) || hasPendingUserEdit(key)) continue

        const remoteValue = shared[key]
        const localValue = window.localStorage.getItem(key)

        if (typeof remoteValue !== "string") {
          if (remoteWins && key === DELETED_PROJECT_IDS_KEY) {
            setLocalValue(key, "[]")
            knownValues.set(key, "[]")
            lastUserEditAt.delete(key)
            changed = localValue !== "[]"
          }
          continue
        }

        const liveValue = stripDemoSharedValue(remoteValue)
        const keepTombstones = key === PROJECTS_REGISTRY_KEY || key === DELETED_PROJECT_IDS_KEY
        const nextValue = keepTombstones && !remoteWins
          ? mergeSharedStorageValue(key, localValue, liveValue)
          : liveValue
        if (nextValue !== localValue) {
          setLocalValue(key, nextValue)
          changed = true
        }
        knownValues.set(key, nextValue)
        lastUserEditAt.delete(key)
      }

      const snapshot = {}
      for (const key of syncKeys) {
        const value = window.localStorage.getItem(key)
        if (value !== null) snapshot[key] = value
      }
      const purged = remoteWins
        ? reconcileLiveProjectsWithTombstones(snapshot)
        : purgeDeletedProjectsFromStorage(snapshot)
      for (const key of syncKeys) {
        if (typeof purged[key] === "string" && purged[key] !== snapshot[key]) {
          setLocalValue(key, purged[key])
          knownValues.set(key, purged[key])
          changed = true
        }
      }

      invalidateGroveCaches()
      const calendarChanged = ensureCalendar
        ? runSystemStorageWrite(() => ensureAllActiveProjectsDailyFiles())
        : false
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
      if (!lastUserEditAt.has(key) && knownValues.has(key)) continue

      try {
        const published = await publishKey(key, value, {
          replace: SNAPSHOT_PUBLISH_KEYS.has(key),
        })
        if (SNAPSHOT_PUBLISH_KEYS.has(key) || published === value) {
          knownValues.set(key, value)
        } else {
          setLocalValue(key, published)
          mergedFromServer = true
          knownValues.set(key, published)
        }
        lastUserEditAt.delete(key)
        pushedKeys.add(key)
      } catch {
        // Keep the local value queued for the next sync attempt.
      }
    }

    if (mergedFromServer) notifyRemoteChange()
    return pushedKeys
  }

  const synchronize = async (reason = "poll") => {
    if (stopped) {
      resolveReady()
      return
    }
    if (syncing) {
      if (reason === "write") persistenceControl.pending = true
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
          if (hasPendingUserEdit(key)) pendingKeys.add(key)
        }

        await pull({ skipKeys: pendingKeys, remoteWins: true })
        const pushedKeys = await pushLocalChanges()
        if (pushedKeys.size > 0) notifyRemoteChange()
      } while (persistenceControl.pending && !stopped)
    } finally {
      syncing = false
      resolveReady()
    }
  }

  window.localStorage.setItem = (key, value) => {
    originalSetItem(key, value)
    if (!applyingRemote && syncKeySet.has(String(key))) {
      if (!isSystemStorageWrite()) {
        lastUserEditAt.set(String(key), Date.now())
        markSharedStorageLocalWrite(String(key))
      }
      window.clearTimeout(writeTimer)
      writeTimer = window.setTimeout(() => {
        void synchronize("write")
      }, writeDebounceMs)
    }
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") void synchronize("poll")
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
  void synchronize("write")
  const intervalId = window.setInterval(() => {
    void synchronize("poll")
  }, syncIntervalMs)

  const stop = () => {
    stopped = true
    resolveReady()
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
