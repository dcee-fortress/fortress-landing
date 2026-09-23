import { readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import bundledSharedStorage from "@/data/grove-shared-storage.json"
import { postgresAvailable, query } from "@/lib/postgres"
import { readGithubSharedStore, writeGithubSharedStore } from "@/lib/githubSharedStore"
import {
  parseRegistryJson,
} from "@/lib/projectCalendarEnsure"
import {
  applyDeletedProjectIds,
  collectDeletedProjectIds,
  DELETED_PROJECT_IDS_KEY,
  emptySharedStorage,
  mergeDeletedProjectIdLists,
  mergeSharedStorageMaps,
  mergeSharedStorageValue,
  pickRichestSharedStorage,
  PROJECTS_REGISTRY_KEY,
  purgeDeletedProjectsFromStorage,
  reconcileLiveProjectsWithTombstones,
  RETIRED_PROJECT_IDS,
  SHARED_STORAGE_KEYS,
  scoreSharedStorage,
  slimProjectsRegistryValue,
  stampStorageUpdatedAt,
  STORAGE_UPDATED_AT_KEY,
  stripDemoSharedStorage,
  countRegistryProjects,
  keepRicherRegistryValue,
} from "@/lib/sharedStorageMerge"
import {
  LIVE_SHARED_STORAGE_URL,
  shouldSyncLiveData,
} from "@/lib/liveDataConfig"
import { parseJsonText, readResponseJson } from "@/lib/safeJson"

const FILE_NAME = "grove-shared-storage.json"
const LOCAL_FILE_NAME = "grove-shared-storage.local.json"

function diskPaths() {
  return [
    path.join(process.cwd(), "data", LOCAL_FILE_NAME),
    path.join(os.tmpdir(), FILE_NAME),
  ]
}

function bundledStore() {
  return bundledSharedStorage && typeof bundledSharedStorage === "object"
    ? { ...bundledSharedStorage }
    : {}
}

function memoryStore() {
  if (!globalThis.__groveSharedStorage || typeof globalThis.__groveSharedStorage !== "object") {
    globalThis.__groveSharedStorage = {}
  }
  return globalThis.__groveSharedStorage
}

function setMemoryStore(storage) {
  globalThis.__groveSharedStorage = storage
}

async function readDiskStore() {
  for (const file of diskPaths()) {
    try {
      const raw = await readFile(file, "utf8")
      const parsed = parseJsonText(raw)
      if (parsed && typeof parsed === "object") {
        return parsed
      }
    } catch {
      // Try the next location.
    }
  }
  return {}
}

let tableReady = null

async function ensureStorageTable() {
  if (!tableReady) {
    tableReady = query(
      `CREATE TABLE IF NOT EXISTS grove_shared_storage (
        storage_key TEXT PRIMARY KEY,
        storage_value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    ).then(() => true)
  }

  await tableReady
}

async function readPostgresStore() {
  if (!postgresAvailable()) return null

  await ensureStorageTable()
  const result = await query(
    `SELECT storage_key, storage_value
     FROM grove_shared_storage`
  )

  return Object.fromEntries(
    result.rows.map(({ storage_key, storage_value }) => [storage_key, storage_value])
  )
}

async function upsertPostgresValue(key, value) {
  if (!postgresAvailable()) return false

  await ensureStorageTable()
  await query(
    `INSERT INTO grove_shared_storage (storage_key, storage_value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (storage_key)
     DO UPDATE SET storage_value = EXCLUDED.storage_value, updated_at = NOW()`,
    [key, value]
  )
  return true
}

async function deletePostgresValue(key) {
  if (!postgresAvailable()) return false

  await ensureStorageTable()
  await query(`DELETE FROM grove_shared_storage WHERE storage_key = $1`, [key])
  return true
}

let writeQueue = Promise.resolve()
const STORAGE_LOCK_KEY = 87236401

async function withPostgresLock(work) {
  if (!postgresAvailable()) return work()

  await ensureStorageTable()
  await query(`SELECT pg_advisory_lock($1)`, [STORAGE_LOCK_KEY])
  try {
    return await work()
  } finally {
    await query(`SELECT pg_advisory_unlock($1)`, [STORAGE_LOCK_KEY])
  }
}

function enqueueWrite(work) {
  const run = writeQueue.then(
    () => withPostgresLock(work),
    () => withPostgresLock(work)
  )
  writeQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

const GITHUB_SNAPSHOT_MAX_BYTES = 900_000

async function persistChangedKeys(storage, keys, options = {}) {
  if (process.env.VERCEL && !postgresAvailable()) {
    throw new Error("Postgres is not configured on Vercel.")
  }

  storage[STORAGE_UPDATED_AT_KEY] = stampStorageUpdatedAt()
  setMemoryStore(storage)
  rememberPostgresStore(storage)
  if (!postgresAvailable()) return

  await ensureStorageTable()
  const keyList = keys.includes(STORAGE_UPDATED_AT_KEY) ? keys : [...keys, STORAGE_UPDATED_AT_KEY]

  for (const key of keyList) {
    let value = storage[key]
    if (typeof value !== "string") continue
    if (key === PROJECTS_REGISTRY_KEY) {
      const latest = await readPostgresStoreCached()
      if (latest && typeof latest[PROJECTS_REGISTRY_KEY] === "string") {
        value = keepRicherRegistryValue(latest[PROJECTS_REGISTRY_KEY], value, {
          allowEmptyReplace: options.allowEmptyReplace === true,
        })
        if (
          options.allowEmptyReplace !== true &&
          countRegistryProjects(value) < countRegistryProjects(latest[PROJECTS_REGISTRY_KEY])
        ) {
          value = latest[PROJECTS_REGISTRY_KEY]
        }
      }
      value = slimProjectsRegistryValue(value)
      storage[key] = value
    }
    if (key === DELETED_PROJECT_IDS_KEY) {
      const registry = parseRegistryJson(storage[PROJECTS_REGISTRY_KEY])
      const liveIds = new Set((registry.projects ?? []).map((project) => project?.id).filter(Boolean))
      value = JSON.stringify(
        mergeDeletedProjectIdLists(value, registry.deletedIds ?? [], RETIRED_PROJECT_IDS).filter(
          (id) => !liveIds.has(id)
        )
      )
      storage[key] = value
    }
    await upsertPostgresValue(key, value)
  }
}

async function persistPurgedStore(purged, options = {}) {
  await persistChangedKeys(purged, SHARED_STORAGE_KEYS, options)

  // Never block the write lock on GitHub snapshot uploads.
  void (async () => {
    try {
      const serialized = JSON.stringify(purged)
      if (serialized.length < GITHUB_SNAPSHOT_MAX_BYTES) {
        await writeGithubSharedStore(purged)
      }
    } catch {
      // Postgres is the shared source of truth for every device.
    }
  })()
}

async function ensureDurableCopy(storage) {
  if (!postgresAvailable() || scoreSharedStorage(storage) <= 0) return

  try {
    const existing = await readPostgresStore()
    if (existing && storeHasProjects(existing)) return
    await persistPurgedStore(storage)
  } catch {
    // Keep serving GitHub/memory when Postgres is still empty.
  }
}

let liveReadCache = { at: 0, data: null, inflight: null }
const LIVE_READ_CACHE_MS = 5000

let postgresReadCache = { at: 0, data: null, inflight: null }
const POSTGRES_READ_CACHE_MS = 30_000

function rememberLiveStore(storage) {
  if (!storage || typeof storage !== "object") return
  liveReadCache = { at: Date.now(), data: storage, inflight: null }
}

function rememberPostgresStore(storage) {
  if (!storage || typeof storage !== "object") return
  postgresReadCache = { at: Date.now(), data: storage, inflight: null }
}

async function readPostgresStoreCached() {
  if (postgresReadCache.data && Date.now() - postgresReadCache.at < POSTGRES_READ_CACHE_MS) {
    return postgresReadCache.data
  }
  if (postgresReadCache.inflight) return postgresReadCache.inflight

  postgresReadCache.inflight = (async () => {
    const data = await readPostgresStore()
    if (data) rememberPostgresStore(data)
    return data
  })()

  try {
    return await postgresReadCache.inflight
  } finally {
    postgresReadCache.inflight = null
  }
}

async function fetchLiveStoreOnce() {
  const response = await fetch(`${LIVE_SHARED_STORAGE_URL}?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) return null
  const live = await readResponseJson(response)
  if (!live || typeof live !== "object" || live.error) return null
  return stripDemoSharedStorage(live)
}

async function fetchLiveStore() {
  if (liveReadCache.data && Date.now() - liveReadCache.at < LIVE_READ_CACHE_MS) {
    return liveReadCache.data
  }
  if (liveReadCache.inflight) return liveReadCache.inflight

  liveReadCache.inflight = (async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const cleaned = await fetchLiveStoreOnce()
        if (cleaned) {
          rememberLiveStore(cleaned)
          return cleaned
        }
      } catch {
        // Retry; Cursor localhost must not fall back to a second database.
      }
    }
    return liveReadCache.data
  })()

  try {
    return await liveReadCache.inflight
  } finally {
    liveReadCache.inflight = null
  }
}

function storeHasProjects(store) {
  return countRegistryProjects(store) > 0
}

function cleanSharedStore(...stores) {
  const mergedIds = collectDeletedProjectIds(...stores.filter(Boolean))
  const richest = pickRichestSharedStorage(...stores.filter(Boolean))
  if (!richest) return emptySharedStorage()
  return purgeDeletedProjectsFromStorage(
    applyDeletedProjectIds(stripDemoSharedStorage(richest), mergedIds)
  )
}

async function hydratePostgresFromLiveIfNeeded(postgres) {
  const localScore = scoreSharedStorage(postgres || {})
  if (localScore > 0 && storeHasProjects(postgres)) {
    return null
  }

  try {
    const live = await fetchLiveStore()
    if (!live || scoreSharedStorage(live) <= localScore) return null

    const merged = mergeSharedStorageMaps(postgres || {}, live)
    const next = purgeDeletedProjectsFromStorage(
      applyDeletedProjectIds(
        stripDemoSharedStorage(merged),
        collectDeletedProjectIds(postgres, live)
      )
    )

    // Seed local Postgres from the live site so localhost matches Rodcroft.
    try {
      await persistPurgedStore(next)
      rememberPostgresStore(next)
    } catch {
      // Still serve the live snapshot even if Postgres write is slow/unavailable.
    }

    return next
  } catch {
    return null
  }
}

async function loadStore() {
  if (shouldSyncLiveData()) {
    try {
      const live = await fetchLiveStore()
      if (live) {
        const next = reconcileLiveProjectsWithTombstones(live)
        setMemoryStore(next)
        return next
      }
    } catch {
      // Keep the last successful live snapshot only.
    }

    if (liveReadCache.data) {
      return reconcileLiveProjectsWithTombstones(liveReadCache.data)
    }

    return emptySharedStorage()
  }

  const bundled = bundledStore()
  const memory = memoryStore()
  const disk = await readDiskStore()
  let postgres = null
  try {
    postgres = await readPostgresStoreCached()
  } catch {
    postgres = null
  }

  const hydrated = await hydratePostgresFromLiveIfNeeded(postgres)
  if (hydrated) {
    setMemoryStore(hydrated)
    return hydrated
  }

  if (postgres && storeHasProjects(postgres)) {
    const next = purgeDeletedProjectsFromStorage(
      applyDeletedProjectIds(stripDemoSharedStorage(postgres), collectDeletedProjectIds(postgres))
    )
    setMemoryStore(next)
    return next
  }

  const github = await readGithubSharedStore()
  const cleaned = cleanSharedStore(github, disk, memory, bundled, postgres)
  setMemoryStore(cleaned)
  return cleaned
}

async function persistStore(storage) {
  await persistPurgedStore(storage)
}

export async function readSharedStorage() {
  // Serve the warm in-memory snapshot immediately so page navigation is not
  // blocked behind a multi-second Postgres table scan.
  const memory = memoryStore()
  if (
    storeHasProjects(memory) &&
    postgresReadCache.data &&
    Date.now() - postgresReadCache.at < POSTGRES_READ_CACHE_MS
  ) {
    const cached = reconcileLiveProjectsWithTombstones(memory)
    return shouldSyncLiveData()
      ? stripDemoSharedStorage(cached)
      : purgeDeletedProjectsFromStorage(cached)
  }

  const storage = reconcileLiveProjectsWithTombstones(await loadStore())

  if (shouldSyncLiveData()) {
    return stripDemoSharedStorage(storage)
  }

  return purgeDeletedProjectsFromStorage(storage)
}

export async function replaceSharedStorage(incomingStorage = {}, options = {}) {
  return enqueueWrite(async () => {
    const existing = await loadStore()
    const incoming = {}
    for (const key of SHARED_STORAGE_KEYS) {
      if (typeof incomingStorage[key] === "string") {
        incoming[key] = incomingStorage[key]
      }
    }
    if (typeof incoming[PROJECTS_REGISTRY_KEY] === "string") {
      incoming[PROJECTS_REGISTRY_KEY] = keepRicherRegistryValue(
        existing[PROJECTS_REGISTRY_KEY],
        incoming[PROJECTS_REGISTRY_KEY],
        { allowEmptyReplace: options.forceEmpty === true }
      )
    }
    const nextStorage = applyDeletedProjectIds(
      mergeSharedStorageMaps(existing, incoming),
      RETIRED_PROJECT_IDS
    )

    if (
      options.forceEmpty !== true &&
      countRegistryProjects(nextStorage) < countRegistryProjects(existing)
    ) {
      throw new Error("Refusing to replace Postgres with a smaller project list.")
    }

    if (shouldSyncLiveData()) {
      return await loadStore()
    }

    setMemoryStore(nextStorage)
    await persistPurgedStore(nextStorage, { allowEmptyReplace: options.forceEmpty === true })

    return nextStorage
  })
}

export async function writeSharedValues(updates = {}, options = {}) {
  const replaceKeys = new Set(options.replaceKeys ?? [])

  return enqueueWrite(async () => {
    const storage = { ...(await loadStore()) }
    const previouslyDeleted = new Set(collectDeletedProjectIds(storage))

    for (const [key, incomingValue] of Object.entries(updates)) {
      if (!SHARED_STORAGE_KEYS.includes(key) || typeof incomingValue !== "string") continue

      if (key === DELETED_PROJECT_IDS_KEY) {
        storage[key] = replaceKeys.has(key)
          ? incomingValue
          : JSON.stringify(
              mergeDeletedProjectIdLists(storage[key], incomingValue, [...previouslyDeleted])
            )
      } else if (replaceKeys.has(key)) {
        storage[key] =
          key === PROJECTS_REGISTRY_KEY
            ? keepRicherRegistryValue(storage[key], incomingValue)
            : incomingValue
      } else {
        storage[key] = mergeSharedStorageValue(key, storage[key], incomingValue)
      }

      if (key === PROJECTS_REGISTRY_KEY) {
        const registry = parseRegistryJson(storage[key])
        const projects = (registry.projects ?? []).filter((project) => project?.id)
        const liveIds = new Set(projects.map((project) => project.id))
        // Keep calendar file lists (daily/weekly/monthly). slimProjectsRegistryValue
        // already scopes files to live project ids — do not wipe them here.
        storage[key] = slimProjectsRegistryValue(
          JSON.stringify({
            ...registry,
            projects,
            files: registry.files ?? {},
            deletedIds: mergeDeletedProjectIdLists(registry.deletedIds ?? [], RETIRED_PROJECT_IDS).filter(
              (id) => !liveIds.has(id)
            ),
          })
        )
        storage[DELETED_PROJECT_IDS_KEY] = JSON.stringify(
          mergeDeletedProjectIdLists(storage[DELETED_PROJECT_IDS_KEY], RETIRED_PROJECT_IDS).filter(
            (id) => !liveIds.has(id)
          )
        )
      }
    }

    const registry = parseRegistryJson(storage[PROJECTS_REGISTRY_KEY])
    const liveIds = new Set((registry.projects ?? []).map((project) => project?.id).filter(Boolean))
    storage[DELETED_PROJECT_IDS_KEY] = JSON.stringify(
      mergeDeletedProjectIdLists(storage[DELETED_PROJECT_IDS_KEY], RETIRED_PROJECT_IDS).filter(
        (id) => !liveIds.has(id)
      )
    )
    const extraDeleted = collectDeletedProjectIds(storage).filter((id) => !liveIds.has(id))
    const next = applyDeletedProjectIds(storage, extraDeleted)

    if (shouldSyncLiveData()) {
      return await loadStore()
    }

    const changedKeys = [
      ...Object.keys(updates).filter((key) => SHARED_STORAGE_KEYS.includes(key)),
      DELETED_PROJECT_IDS_KEY,
    ]
    if (Object.keys(updates).includes(PROJECTS_REGISTRY_KEY)) {
      changedKeys.push(PROJECTS_REGISTRY_KEY)
    }
    await persistChangedKeys(next, [...new Set(changedKeys)])
    return next
  })
}

export async function writeSharedValue(key, incomingValue, options = {}) {
  const replace = options.replace === true

  return enqueueWrite(async () => {
    if (shouldSyncLiveData()) {
      return incomingValue
    }

    const storage = await loadStore()

    if (key === DELETED_PROJECT_IDS_KEY) {
      storage[key] = replace
        ? incomingValue
        : JSON.stringify(mergeDeletedProjectIdLists(storage[key], incomingValue))
    } else if (replace) {
      storage[key] =
        key === PROJECTS_REGISTRY_KEY
          ? keepRicherRegistryValue(storage[key], incomingValue)
          : incomingValue
    } else {
      storage[key] = mergeSharedStorageValue(key, storage[key], incomingValue)
    }

    if (key === PROJECTS_REGISTRY_KEY) {
      const registry = parseRegistryJson(storage[key])
      const projects = (registry.projects ?? []).filter((project) => project?.id)
      const liveIds = new Set(projects.map((project) => project.id))
      storage[key] = slimProjectsRegistryValue(
        JSON.stringify({
          ...registry,
          projects,
          files: registry.files ?? {},
          deletedIds: mergeDeletedProjectIdLists(registry.deletedIds ?? [], RETIRED_PROJECT_IDS).filter(
            (id) => !liveIds.has(id)
          ),
        })
      )
      storage[DELETED_PROJECT_IDS_KEY] = JSON.stringify(
        mergeDeletedProjectIdLists(storage[DELETED_PROJECT_IDS_KEY], RETIRED_PROJECT_IDS).filter(
          (id) => !liveIds.has(id)
        )
      )
      await persistChangedKeys(storage, [PROJECTS_REGISTRY_KEY, DELETED_PROJECT_IDS_KEY])
      return storage[key]
    }

    if (key === DELETED_PROJECT_IDS_KEY) {
      const registry = parseRegistryJson(storage[PROJECTS_REGISTRY_KEY])
      const liveIds = new Set((registry.projects ?? []).map((project) => project?.id).filter(Boolean))
      storage[key] = JSON.stringify(
        mergeDeletedProjectIdLists(storage[key], RETIRED_PROJECT_IDS).filter((id) => !liveIds.has(id))
      )
      await persistChangedKeys(storage, [DELETED_PROJECT_IDS_KEY])
      return storage[key]
    }

    // Persist only the changed key. Rewriting the full registry on every module
    // save was serializing the advisory lock for minutes and stalling navigation.
    await persistChangedKeys(storage, [key])
    return storage[key]
  })
}

export async function removeSharedValue(key) {
  return enqueueWrite(async () => {
    if (shouldSyncLiveData()) {
      return
    }

    const storage = await loadStore()
    delete storage[key]
    await persistStore(storage)

    try {
      await deletePostgresValue(key)
    } catch {
      // File/memory storage still dropped the key.
    }
  })
}
