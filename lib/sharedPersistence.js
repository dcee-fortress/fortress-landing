import { ensureAllActiveProjectsDailyFiles } from "@/lib/dailyFileSync"
import {
  getGroveItem,
  hydrateGroveStoreFromSession,
  removeGroveItem,
  setGroveItem,
  subscribeGroveStore,
} from "@/lib/groveClientStore"
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
  keepRicherRegistryValue,
  countRegistryProjects,
  STORAGE_UPDATED_AT_KEY,
  stripDemoSharedValue,
} from "@/lib/sharedStorageMerge"
import {
  markSharedStorageLocalWrite,
  wasRecentlyWrittenLocally,
} from "@/lib/sharedStorageGuard"
import { shouldPublishSharedData } from "@/lib/liveDataConfig"
import { readResponseJson } from "@/lib/safeJson"
import { emitSyncStatus } from "@/lib/syncStatus"

const SNAPSHOT_PUBLISH_KEYS = new Set([
  GROVE_STORAGE_KEYS.projectData,
  GROVE_STORAGE_KEYS.materialSchedules,
  GROVE_STORAGE_KEYS.materialScheduleDrafts,
  GROVE_STORAGE_KEYS.pettyCash,
  GROVE_STORAGE_KEYS.goodsReceived,
  GROVE_STORAGE_KEYS.goodsAcquired,
  GROVE_STORAGE_KEYS.ppeReceived,
  GROVE_STORAGE_KEYS.ppeIssued,
  GROVE_STORAGE_KEYS.inductionRegisters,
  GROVE_STORAGE_KEYS.sheqSiteInspection,
  GROVE_STORAGE_KEYS.sheqIncident,
  GROVE_STORAGE_KEYS.sheqWeeklyReport,
  GROVE_STORAGE_KEYS.sheqHomeAlerts,
  GROVE_STORAGE_KEYS.fileTrash,
  GROVE_STORAGE_KEYS.boq,
  GROVE_STORAGE_KEYS.boqDescriptionMemory,
  GROVE_STORAGE_KEYS.materialFormulaMemory,
  GROVE_STORAGE_KEYS.plantCost,
  GROVE_STORAGE_KEYS.plantHours,
  GROVE_STORAGE_KEYS.equipmentHours,
  GROVE_STORAGE_KEYS.plantOperatorRegisters,
  GROVE_STORAGE_KEYS.siteStaffRegisters,
])
const syncKeys = Object.values(GROVE_STORAGE_KEYS).filter(
  (key) => key !== GROVE_STORAGE_KEYS.lastSession && key !== GROVE_STORAGE_KEYS.bootstrapDone
)
const syncKeySet = new Set(syncKeys)
const syncIntervalMs =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? 45_000
    : 8_000
const writeDebounceMs = 1800
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
  const response = await fetch("/api/shared-storage", {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error("Shared storage is unavailable")
  const data = await readResponseJson(response, {})
  if (data?.error && typeof data.error === "string" && !("grove-projects-registry" in data)) {
    throw new Error(data.error)
  }
  return data
}

async function publishKey(key, value, options = {}) {
  const payload = key === PROJECTS_REGISTRY_KEY ? slimProjectsRegistryValue(value) : value
  if (key === PROJECTS_REGISTRY_KEY && countRegistryProjects(payload) === 0) {
    return payload
  }
  const response = await fetch("/api/shared-storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: payload, replace: options.replace === true }),
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

async function replaceRemoteStorage(storage, options = {}) {
  const payload = { ...storage }
  if (typeof payload[PROJECTS_REGISTRY_KEY] === "string") {
    payload[PROJECTS_REGISTRY_KEY] = slimProjectsRegistryValue(payload[PROJECTS_REGISTRY_KEY])
  }
  if (countRegistryProjects(payload[PROJECTS_REGISTRY_KEY]) === 0 && options.forceEmpty !== true) {
    throw new Error("Refusing to replace live storage with an empty project list.")
  }
  const response = await fetch("/api/shared-storage", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      replace: true,
      storage: payload,
      forceEmpty: options.forceEmpty === true,
    }),
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

  const setLocalValue = (key, value) => {
    applyingRemote = true
    try {
      try {
        setGroveItem(key, value)
      } catch {
        if (key === PROJECTS_REGISTRY_KEY) {
          setGroveItem(key, slimProjectsRegistryValue(value))
        } else {
          throw new Error("In-memory store write failed")
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
        const localValue = getGroveItem(key)

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
        const value = getGroveItem(key)
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
      if (key === DELETED_PROJECT_IDS_KEY) continue
      const value = getGroveItem(key)
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

      updates[key] =
        key === PROJECTS_REGISTRY_KEY ? slimProjectsRegistryValue(value) : value
      if (
        key === PROJECTS_REGISTRY_KEY &&
        countRegistryProjects(updates[key]) === 0 &&
        countRegistryProjects(known) > 0
      ) {
        delete updates[key]
        continue
      }
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
          if (jsonValuesEqual(remote, value)) {
            knownValues.set(key, value)
          } else if (key === PROJECTS_REGISTRY_KEY) {
            const merged = keepRicherRegistryValue(value, remote)
            setLocalValue(key, merged)
            mergedFromServer = true
            knownValues.set(key, merged)
          } else if (SNAPSHOT_PUBLISH_KEYS.has(key) || SNAPSHOT_STORAGE_KEYS.has(key)) {
            const merged = mergeSharedStorageValue(key, value, remote)
            setLocalValue(key, merged)
            mergedFromServer = !jsonValuesEqual(merged, value)
            knownValues.set(key, merged)
          } else {
            setLocalValue(key, remote)
            mergedFromServer = true
            knownValues.set(key, remote)
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

      const currentValue = getGroveItem(key)
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
      const value = getGroveItem(key)
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
              message: "Using in-memory cache",
              cacheAt: parseStorageUpdatedAt(readLocalSnapshot()[STORAGE_UPDATED_AT_KEY]),
            })
            continue
          }

          const localSnapshot = readLocalSnapshot()
          const localAt = parseStorageUpdatedAt(localSnapshot[STORAGE_UPDATED_AT_KEY])
          const remoteAt = parseStorageUpdatedAt(remoteSnapshot[STORAGE_UPDATED_AT_KEY])
          const nowIso = new Date().toISOString()
          const onLiveSite = shouldPublishSharedData()

          if (onLiveSite) {
            if (countRegistryProjects(localSnapshot) > countRegistryProjects(remoteSnapshot)) {
              try {
                remoteSnapshot = reconcileLiveProjectsWithTombstones(
                  await replaceRemoteStorage(localSnapshot)
                )
              } catch {
                try {
                  const registry = localSnapshot[PROJECTS_REGISTRY_KEY]
                  if (typeof registry === "string") {
                    await publishKey(PROJECTS_REGISTRY_KEY, registry, { replace: true })
                    remoteSnapshot = reconcileLiveProjectsWithTombstones(await fetchSharedStorage())
                  }
                } catch {
                  emitSyncStatus({
                    state: "offline",
                    message: "Could not save live project to Postgres",
                  })
                }
              }
            }
            persistenceControl.applySnapshot?.(remoteSnapshot)
            emitSyncStatus({
              state: "synced",
              source: "Postgres",
              message: "Postgres is the live database",
              lastSync: nowIso,
              postgresAt: parseStorageUpdatedAt(remoteSnapshot[STORAGE_UPDATED_AT_KEY]) || remoteAt,
              cacheAt: parseStorageUpdatedAt(remoteSnapshot[STORAGE_UPDATED_AT_KEY]) || remoteAt,
            })
          } else {
            emitSyncStatus({
              state: "synced",
              source: "Postgres",
              message: "Local cache waiting. Click Sync Now or say “pull live”.",
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
          if (shouldPublishSharedData()) {
            try {
              await pushLocalChanges()
            } catch {
              // Retry on the next poll so other devices can still receive the save.
            }
          }
          continue
        }

        try {
          if (!shouldPublishSharedData()) {
            emitSyncStatus({
              state: "synced",
              source: "Postgres",
              message: "Local cache waiting. Click Sync Now or say “pull live”.",
              silent: true,
            })
            continue
          }

          const remoteSnapshot = reconcileLiveProjectsWithTombstones(await fetchSharedStorage())
          const localSnapshot = readLocalSnapshot()
          const localAt = parseStorageUpdatedAt(localSnapshot[STORAGE_UPDATED_AT_KEY])
          const remoteAt = parseStorageUpdatedAt(remoteSnapshot[STORAGE_UPDATED_AT_KEY])
          const pendingEdits = [...syncKeys].some((key) => hasPendingUserEdit(key))
          if (countRegistryProjects(localSnapshot) > countRegistryProjects(remoteSnapshot)) {
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

          const latest = reconcileLiveProjectsWithTombstones(await fetchSharedStorage())
          const changed = !pendingEdits ? applyRemoteCache(latest) : false
          const remoteHasData = countRegistryProjects(latest) > 0

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
            message: "Using in-memory cache",
            cacheAt: parseStorageUpdatedAt(getGroveItem(STORAGE_UPDATED_AT_KEY)),
          })
        }
        continue
      } while (persistenceControl.pending && !stopped)
    } finally {
      syncing = false
      resolveReady()
    }
  }

  const unsubscribeStore = subscribeGroveStore((key) => {
    if (!key || !syncKeySet.has(key) || applyingRemote || isSystemStorageWrite()) return
    lastUserEditAt.set(key, Date.now())
    markSharedStorageLocalWrite(key)
    if (!shouldPublishSharedData()) return
    window.clearTimeout(writeTimer)
    writeTimer = window.setTimeout(() => {
      void synchronize("write")
    }, writeDebounceMs)
  })

  const onVisible = () => {
    if (document.visibilityState === "visible" && shouldPublishSharedData()) void synchronize("poll")
  }
  document.addEventListener("visibilitychange", onVisible)
  window.addEventListener("focus", onVisible)

  sharedPersistenceReady = ready
  persistenceControl.applySnapshot = (storage = {}) => {
    for (const key of syncKeys) {
      const value = storage[key]
      if (typeof value === "string") {
        const localValue = getGroveItem(key)
        // Snapshot stores (SHEQ incident, trash, etc.) merge so local delete
        // tombstones are not wiped by an older remote snapshot.
        const nextValue =
          SNAPSHOT_STORAGE_KEYS.has(key) && typeof localValue === "string"
            ? mergeSharedStorageValue(key, localValue, value)
            : value
        setLocalValue(key, nextValue)
        knownValues.set(key, typeof nextValue === "string" ? nextValue : value)
        markSharedStorageLocalWrite(key)
        continue
      }

      // Missing remote keys must not wipe local data (new modules like PPE /
      // site-staff registers are often not on Postgres yet). Keep local values.
      if (hasPendingUserEdit(key) || wasRecentlyWrittenLocally(key)) continue
      if (getGroveItem(key) != null) continue

      applyingRemote = true
      try {
        removeGroveItem(key)
      } finally {
        applyingRemote = false
      }
      knownValues.delete(key)
    }
    notifyRemoteChange()
  }

  // Paint immediately from session cache; Postgres sync continues in background.
  const hadCache = hydrateGroveStoreFromSession()
  if (hadCache) {
    for (const key of syncKeys) {
      const value = getGroveItem(key)
      if (typeof value === "string") knownValues.set(key, value)
    }
    invalidateGroveCaches()
    notifyRemoteChange()
    resolveReady()
    emitSyncStatus({
      state: "synced",
      source: "Cache",
      message: "Opened from local cache. Syncing Postgres in background…",
      silent: true,
    })
  } else {
    // Still unlock UI quickly; first poll fills the store.
    resolveReady()
  }

  const stop = () => {
    stopped = true
    resolveReady()
    window.clearInterval(intervalId)
    window.clearTimeout(writeTimer)
    document.removeEventListener("visibilitychange", onVisible)
    window.removeEventListener("focus", onVisible)
    unsubscribeStore()
  }

  void synchronize("poll")
  const intervalId = window.setInterval(() => {
    if (shouldPublishSharedData()) void synchronize("poll")
  }, syncIntervalMs)

  return { stop, ready }
}

export async function pullFromLivePostgres() {
  if (typeof window === "undefined") return null

  const remote = reconcileLiveProjectsWithTombstones(await fetchSharedStorage())
  if (persistenceControl.applySnapshot) {
    persistenceControl.applySnapshot(remote)
  } else {
    for (const key of syncKeys) {
      const value = remote[key]
      if (typeof value === "string") setGroveItem(key, value)
      else removeGroveItem(key)
    }
    invalidateGroveCaches()
    window.dispatchEvent(new Event("grove-shared-storage-change"))
  }
  emitSyncStatus({
    state: "synced",
    source: "Postgres",
    message: "Pulled live Postgres",
    lastSync: new Date().toISOString(),
  })
  return remote
}

export async function replaceLiveSharedStorage(storage, options = {}) {
  const remote = await replaceRemoteStorage(storage, options)
  if (persistenceControl.applySnapshot) {
    persistenceControl.applySnapshot(remote)
  }
  return remote
}

export async function publishSharedKeys(options = {}) {
  const replace = options.replace === true
  const onlyKeys = Array.isArray(options.keys) ? new Set(options.keys) : null
  const orderedKeys = [
    PROJECTS_REGISTRY_KEY,
    ...(options.includeTombstones === true ? [DELETED_PROJECT_IDS_KEY] : []),
    ...syncKeys.filter((key) => key !== PROJECTS_REGISTRY_KEY && key !== DELETED_PROJECT_IDS_KEY),
  ].filter((key) => !onlyKeys || onlyKeys.has(key))

  const updates = {}
  const replaceKeys = []
  for (const key of orderedKeys) {
    const value = getGroveItem(key)
    if (value === null) continue
    updates[key] =
      key === PROJECTS_REGISTRY_KEY ? slimProjectsRegistryValue(value) : value
    if (replace) replaceKeys.push(key)
  }

  if (Object.keys(updates).length === 0) return

  try {
    await publishKeys(updates, replaceKeys)
    for (const key of Object.keys(updates)) {
      markSharedStorageLocalWrite(key)
    }
  } catch {
    // Fall back to one-by-one so a single bad key cannot block the registry.
    for (const [key, value] of Object.entries(updates)) {
      try {
        await publishKey(key, value, { replace })
        markSharedStorageLocalWrite(key)
      } catch {
        // Keep going.
      }
    }
  }
}

/** Fast path for create / end / delete — only the project list (+ tombstones). */
export async function publishProjectListKeys(options = {}) {
  return publishSharedKeys({
    replace: true,
    includeTombstones: options.includeTombstones === true,
    keys: [PROJECTS_REGISTRY_KEY, DELETED_PROJECT_IDS_KEY],
  })
}
