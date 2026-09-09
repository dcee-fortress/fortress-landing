import { ensureAllActiveProjectsDailyFiles } from "@/lib/dailyFileSync"
import { GROVE_STORAGE_KEYS } from "@/lib/grovePersistence"
import { invalidateGroveCaches } from "@/lib/invalidateGroveCaches"
import {
  DELETED_PROJECT_IDS_KEY,
  mergeSharedStorageMaps,
  mergeSharedStorageValue,
  parseStorageUpdatedAt,
  PROJECTS_REGISTRY_KEY,
  purgeDeletedProjectsFromStorage,
  reconcileLiveProjectsWithTombstones,
  slimProjectsRegistryValue,
  SNAPSHOT_STORAGE_KEYS,
  jsonValuesEqual,
  scoreSharedStorage,
  stampStorageUpdatedAt,
  STORAGE_UPDATED_AT_KEY,
  stripDemoSharedValue,
  keepRicherRegistryValue,
  countRegistryProjects,
} from "@/lib/sharedStorageMerge"
import {
  markSharedStorageLocalWrite,
  wasRecentlyWrittenLocally,
} from "@/lib/sharedStorageGuard"
import { isLiveCodeChannel } from "@/lib/liveDataConfig"
import { readResponseJson } from "@/lib/safeJson"
import { emitSyncStatus } from "@/lib/syncStatus"

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
const writeDebounceMs = 1200
const USER_EDIT_GRACE_MS = 30000

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

async function publishKeys(updates, replaceKeys = []) {
  const response = await fetch("/api/shared-storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys: updates, replaceKeys }),
  })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  const data = await readResponseJson(response, {})
  return data.storage && typeof data.storage === "object" ? data.storage : updates
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

let persistenceUsers = 0
let persistenceSession = null
let persistenceStopTimer = 0

export function startSharedPersistence() {
  if (typeof window === "undefined") return () => {}

  window.clearTimeout(persistenceStopTimer)
  persistenceUsers += 1
  if (!persistenceSession) {
    persistenceSession = createSharedPersistenceSession()
  }

  const session = persistenceSession
  const stop = () => {
    persistenceUsers = Math.max(0, persistenceUsers - 1)
    if (persistenceUsers === 0 && persistenceSession === session) {
      persistenceStopTimer = window.setTimeout(() => {
        if (persistenceUsers === 0 && persistenceSession === session) {
          session.stop()
          persistenceSession = null
        }
      }, 750)
    }
  }
  stop.ready = session.ready
  return stop
}

function createSharedPersistenceSession() {
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

      const isProtectedKey = (key) =>
        skipKeys.has(key) || hasPendingUserEdit(key) || wasRecentlyWrittenLocally(key)

      for (const key of syncKeys) {
        if (isProtectedKey(key)) continue

        const remoteValue = shared[key]
        const localValue = window.localStorage.getItem(key)

        if (typeof remoteValue !== "string") {
          if (remoteWins && key === DELETED_PROJECT_IDS_KEY && !localValue) {
            setLocalValue(key, "[]")
            knownValues.set(key, "[]")
            lastUserEditAt.delete(key)
            changed = true
          }
          continue
        }

        const liveValue = stripDemoSharedValue(remoteValue)
        const keepTombstones = key === PROJECTS_REGISTRY_KEY || key === DELETED_PROJECT_IDS_KEY
        const shouldMerge =
          !remoteWins && (keepTombstones || SNAPSHOT_STORAGE_KEYS.has(key))
        const nextValue = shouldMerge
          ? mergeSharedStorageValue(key, localValue, liveValue)
          : liveValue
        if (!jsonValuesEqual(nextValue, localValue)) {
          setLocalValue(key, nextValue)
          changed = true
        }
        if (!jsonValuesEqual(nextValue, liveValue)) {
          knownValues.set(key, liveValue)
          lastUserEditAt.set(key, Date.now())
          markSharedStorageLocalWrite(key)
        } else {
          knownValues.set(key, typeof nextValue === "string" ? nextValue : liveValue)
          lastUserEditAt.delete(key)
        }
      }

      const snapshot = {}
      for (const key of syncKeys) {
        const value = window.localStorage.getItem(key)
        if (value !== null) snapshot[key] = value
      }
      const purged = remoteWins
        ? shared
        : purgeDeletedProjectsFromStorage(snapshot)
      for (const key of syncKeys) {
        if (isProtectedKey(key)) continue
        if (typeof purged[key] === "string" && !jsonValuesEqual(purged[key], snapshot[key])) {
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
    const updates = {}
    const replaceKeys = []
    const deleting = []

    for (const key of syncKeys) {
      const value = window.localStorage.getItem(key)
      if (value === null) {
        if (!knownValues.has(key)) continue
        deleting.push(key)
        continue
      }

      const known = knownValues.get(key)
      if (jsonValuesEqual(known, value)) {
        knownValues.set(key, value)
        continue
      }
      if (!lastUserEditAt.has(key) && knownValues.has(key)) continue

      updates[key] = value
      if (
        SNAPSHOT_PUBLISH_KEYS.has(key) ||
        key === PROJECTS_REGISTRY_KEY ||
        key === DELETED_PROJECT_IDS_KEY
      ) {
        replaceKeys.push(key)
      }
    }

    const pushedKeys = new Set()
    let mergedFromServer = false

    for (const key of deleting) {
      knownValues.delete(key)
      try {
        await deleteKey(key)
        pushedKeys.add(key)
      } catch {
        knownValues.set(key, "deleted")
      }
    }

    if (Object.keys(updates).length > 0) {
      try {
        const published = await publishKeys(updates, replaceKeys)
        for (const [key, value] of Object.entries(updates)) {
          const remote = typeof published[key] === "string" ? published[key] : value
          if (!jsonValuesEqual(remote, value)) {
            setLocalValue(key, remote)
            mergedFromServer = true
            knownValues.set(key, remote)
          } else {
            knownValues.set(key, value)
          }
          lastUserEditAt.delete(key)
          pushedKeys.add(key)
        }
      } catch {
        // Keep the local values queued for the next sync attempt.
      }
    }

    if (mergedFromServer) notifyRemoteChange()
    return pushedKeys
  }

  const applyRemoteCache = (storage = {}) => {
    const localSnapshot = readLocalSnapshot()
    const incoming = {}
    for (const key of syncKeys) {
      if (typeof storage[key] === "string") incoming[key] = storage[key]
    }
    const merged = mergeSharedStorageMaps(localSnapshot, incoming)
    let changed = false

    for (const key of syncKeys) {
      if (hasPendingUserEdit(key) || wasRecentlyWrittenLocally(key)) continue

      const currentValue = window.localStorage.getItem(key)
      const nextValue =
        key === PROJECTS_REGISTRY_KEY
          ? keepRicherRegistryValue(currentValue, merged[key])
          : merged[key]
      if (typeof nextValue !== "string") continue

      if (jsonValuesEqual(nextValue, currentValue)) {
        knownValues.set(key, nextValue)
        continue
      }

      setLocalValue(key, nextValue)
      knownValues.set(key, nextValue)
      changed = true
    }

    if (changed) notifyRemoteChange()
    return changed
  }

  const readLocalSnapshot = () => {
    const snapshot = {}
    for (const key of syncKeys) {
      const value = window.localStorage.getItem(key)
      if (value !== null) snapshot[key] = value
    }
    return snapshot
  }

  const synchronize = async (reason = "poll") => {
    if (stopped) {
      resolveReady()
      return
    }
    if (syncing) {
      if (reason === "write") persistenceControl.pending = "write"
      else if (!persistenceControl.pending) persistenceControl.pending = "poll"
      return
    }
    syncing = true

    try {
      do {
        const cycle = persistenceControl.pending || reason
        persistenceControl.pending = false

        const pendingKeys = new Set()
        for (const key of syncKeys) {
          if (hasPendingUserEdit(key) || wasRecentlyWrittenLocally(key)) pendingKeys.add(key)
        }

        if (!initialized) {
          emitSyncStatus({
            state: "syncing",
            source: "Postgres",
            message: "Reading Postgres…",
          })

          let remoteSnapshot = null
          try {
            remoteSnapshot = reconcileLiveProjectsWithTombstones(await fetchSharedStorage())
          } catch {
            initialized = true
            resolveReady()
            emitSyncStatus({
              state: "offline",
              message: "Using localStorage cache",
              cacheAt: parseStorageUpdatedAt(readLocalSnapshot()[STORAGE_UPDATED_AT_KEY]),
            })
            continue
          }

          const localSnapshot = readLocalSnapshot()
          const localAt = parseStorageUpdatedAt(localSnapshot[STORAGE_UPDATED_AT_KEY])
          const remoteAt = parseStorageUpdatedAt(remoteSnapshot[STORAGE_UPDATED_AT_KEY])
          const nowIso = new Date().toISOString()
          const remoteHasData = scoreSharedStorage(remoteSnapshot) > 0
          const localHasData = scoreSharedStorage(localSnapshot) > 0
          const onLiveSite = isLiveCodeChannel()

          if (onLiveSite && localHasData && countRegistryProjects(localSnapshot) > countRegistryProjects(remoteSnapshot)) {
            try {
              const saved = await replaceRemoteStorage(localSnapshot)
              applyRemoteCache(saved)
              emitSyncStatus({
                state: "synced",
                source: "Postgres",
                message: "Live project saved to Postgres",
                lastSync: nowIso,
              })
            } catch {
              emitSyncStatus({
                state: "offline",
                message: "Could not save live project to Postgres",
              })
            }
          } else if (remoteHasData) {
            applyRemoteCache(remoteSnapshot)
            if (onLiveSite) {
              const mergedRegistry = window.localStorage.getItem(PROJECTS_REGISTRY_KEY)
              if (
                typeof mergedRegistry === "string" &&
                !jsonValuesEqual(mergedRegistry, remoteSnapshot[PROJECTS_REGISTRY_KEY])
              ) {
                try {
                  await publishKey(PROJECTS_REGISTRY_KEY, mergedRegistry, { replace: true })
                } catch {
                  // Keep the local project visible; the next save retries Postgres.
                }
              }
            }
            emitSyncStatus({
              state: "synced",
              source: "Postgres",
              message: "localStorage cache updated from live Postgres",
              lastSync: nowIso,
              postgresAt: remoteAt,
              cacheAt: remoteAt,
            })
          } else {
            emitSyncStatus({
              state: "synced",
              source: "Postgres",
              message: "Waiting for live Postgres projects…",
              lastSync: nowIso,
              postgresAt: remoteAt,
              cacheAt: localAt,
            })
          }

          initialized = true
          resolveReady()
          runSystemStorageWrite(() => ensureAllActiveProjectsDailyFiles())
          continue
        }

        if (cycle === "write") {
          continue
        }

        try {
          const remoteSnapshot = reconcileLiveProjectsWithTombstones(await fetchSharedStorage())
          const localSnapshot = readLocalSnapshot()
          const localAt = parseStorageUpdatedAt(localSnapshot[STORAGE_UPDATED_AT_KEY])
          const remoteAt = parseStorageUpdatedAt(remoteSnapshot[STORAGE_UPDATED_AT_KEY])
          const pendingEdits = [...syncKeys].some((key) => hasPendingUserEdit(key))
          const remoteHasData = scoreSharedStorage(remoteSnapshot) > 0
          const onLiveSite = isLiveCodeChannel()

          if (
            onLiveSite &&
            countRegistryProjects(localSnapshot) > countRegistryProjects(remoteSnapshot)
          ) {
            try {
              await replaceRemoteStorage(localSnapshot)
            } catch {
              try {
                const registry = localSnapshot[PROJECTS_REGISTRY_KEY]
                if (typeof registry === "string") {
                  await publishKey(PROJECTS_REGISTRY_KEY, registry, { replace: true })
                }
              } catch {
                // Keep retrying on the next poll so other devices can see the project.
              }
            }
          }

          const changed = remoteHasData && !pendingEdits ? applyRemoteCache(remoteSnapshot) : false

          if (remoteHasData && !pendingEdits) {
            emitSyncStatus({
              state: "synced",
              source: "Postgres",
              message: "Live Postgres synced to local cache",
              lastSync: new Date().toISOString(),
              postgresAt: remoteAt,
              cacheAt: remoteAt,
              silent: !changed,
            })
          } else if (!remoteHasData) {
            emitSyncStatus({
              state: "synced",
              source: "Postgres",
              message: "Waiting for live Postgres projects…",
              lastSync: new Date().toISOString(),
              postgresAt: remoteAt,
              cacheAt: localAt,
              silent: true,
            })
          } else {
            emitSyncStatus({
              state: "synced",
              source: "Postgres",
              message: "Live Postgres synced to local cache",
              lastSync: new Date().toISOString(),
              postgresAt: remoteAt,
              cacheAt: localAt,
              silent: true,
            })
          }
        } catch {
          emitSyncStatus({
            state: "offline",
            message: "Using localStorage cache",
            cacheAt: parseStorageUpdatedAt(window.localStorage.getItem(STORAGE_UPDATED_AT_KEY)),
          })
        }
        continue
      } while (persistenceControl.pending && !stopped)
    } finally {
      syncing = false
      resolveReady()
    }
  }

  window.localStorage.setItem = (key, value) => {
    originalSetItem(key, value)
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") void synchronize("poll")
  }
  document.addEventListener("visibilitychange", onVisible)
  window.addEventListener("focus", onVisible)

  sharedPersistenceReady = ready
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

  const stop = () => {
    stopped = true
    resolveReady()
    window.clearInterval(intervalId)
    window.clearTimeout(writeTimer)
    document.removeEventListener("visibilitychange", onVisible)
    window.removeEventListener("focus", onVisible)
    window.localStorage.setItem = originalSetItem
  }

  void synchronize("write")
  const intervalId = window.setInterval(() => {
    void synchronize("poll")
  }, syncIntervalMs)

  return { stop, ready }
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
