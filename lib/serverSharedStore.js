import { mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { sql } from "@vercel/postgres"
import bundledSharedStorage from "@/data/grove-shared-storage.json"
import { readGithubSharedStore, writeGithubSharedStore } from "@/lib/githubSharedStore"
import {
  applyCalendarFilesToRegistry,
  parseRegistryJson,
} from "@/lib/projectCalendarEnsure"
import {
  applyDeletedProjectIds,
  collectDeletedProjectIds,
  DELETED_PROJECT_IDS_KEY,
  emptySharedStorage,
  mergeDeletedProjectIdLists,
  mergeSharedStorageValue,
  PROJECTS_REGISTRY_KEY,
  purgeDeletedProjectsFromStorage,
  SHARED_STORAGE_KEYS,
  stripDemoSharedStorage,
} from "@/lib/sharedStorageMerge"

const FILE_NAME = "grove-shared-storage.json"
const LOCAL_FILE_NAME = "grove-shared-storage.local.json"
const LIVE_SHARED_STORAGE_URL = "https://rodcroft-fortress.vercel.app/api/shared-storage"

function shouldReadLiveSite() {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL
}

function diskPaths() {
  return [
    path.join(process.cwd(), "data", LOCAL_FILE_NAME),
    path.join(os.tmpdir(), FILE_NAME),
  ]
}

function postgresAvailable() {
  return Boolean(
    process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL
  )
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
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") {
        return parsed
      }
    } catch {
      // Try the next location.
    }
  }
  return {}
}

async function writeDiskStore(storage) {
  const payload = `${JSON.stringify(storage, null, 2)}\n`
  let written = false

  for (const file of diskPaths()) {
    try {
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, payload, "utf8")
      written = true
    } catch {
      // Read-only deployments still keep the in-memory copy.
    }
  }

  return written
}

let tableReady = null

async function ensureStorageTable() {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS grove_shared_storage (
        storage_key TEXT PRIMARY KEY,
        storage_value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => true)
  }

  await tableReady
}

async function readPostgresStore() {
  if (!postgresAvailable()) return null

  await ensureStorageTable()
  const result = await sql`
    SELECT storage_key, storage_value
    FROM grove_shared_storage
  `

  return Object.fromEntries(
    result.rows.map(({ storage_key, storage_value }) => [storage_key, storage_value])
  )
}

async function upsertPostgresValue(key, value) {
  if (!postgresAvailable()) return false

  await ensureStorageTable()
  await sql`
    INSERT INTO grove_shared_storage (storage_key, storage_value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (storage_key)
    DO UPDATE SET storage_value = EXCLUDED.storage_value, updated_at = NOW()
  `
  return true
}

async function deletePostgresValue(key) {
  if (!postgresAvailable()) return false

  await ensureStorageTable()
  await sql`DELETE FROM grove_shared_storage WHERE storage_key = ${key}`
  return true
}

let writeQueue = Promise.resolve()

function enqueueWrite(work) {
  const run = writeQueue.then(work, work)
  writeQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function persistPurgedStore(purged) {
  await persistStore(purged)
  for (const [key, value] of Object.entries(purged)) {
    if (typeof value !== "string") continue
    try {
      await upsertPostgresValue(key, value)
    } catch {
      // File/memory storage still holds the update.
    }
  }
}

function storeHasRegistry(store) {
  return Boolean(store && typeof store[PROJECTS_REGISTRY_KEY] === "string")
}

async function loadStore() {
  if (shouldReadLiveSite()) {
    try {
      const response = await fetch(`${LIVE_SHARED_STORAGE_URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      if (response.ok) {
        const live = await response.json()
        if (live && typeof live === "object" && !live.error) {
          const cleaned = stripDemoSharedStorage(live)
          setMemoryStore(cleaned)
          return cleaned
        }
      }
    } catch {
      // Fall through to the local snapshot when the live site is unreachable.
    }
  }

  const bundled = bundledStore()
  const memory = memoryStore()
  const disk = await readDiskStore()
  let postgres = null
  try {
    postgres = await readPostgresStore()
  } catch {
    postgres = null
  }
  const github = await readGithubSharedStore()
  const tombstones = collectDeletedProjectIds(bundled, github, disk, memory, postgres)

  const authoritative = storeHasRegistry(memory)
    ? memory
    : storeHasRegistry(postgres)
      ? postgres
      : storeHasRegistry(disk)
        ? disk
        : storeHasRegistry(github)
          ? github
          : bundled

  const cleaned = applyDeletedProjectIds(stripDemoSharedStorage(authoritative), tombstones)
  setMemoryStore(cleaned)
  return cleaned
}

async function persistStore(storage) {
  setMemoryStore(storage)
  await writeDiskStore(storage)
  await writeGithubSharedStore(storage)
}

export async function readSharedStorage() {
  const storage = await loadStore()

  if (shouldReadLiveSite()) {
    return stripDemoSharedStorage(storage)
  }

  const purged = purgeDeletedProjectsFromStorage(storage)
  const currentValue = purged[PROJECTS_REGISTRY_KEY]
  const { registry, changed } = applyCalendarFilesToRegistry(parseRegistryJson(currentValue))

  if (!changed && typeof currentValue === "string") {
    return purgeDeletedProjectsFromStorage(purged)
  }

  const nextValue = JSON.stringify(registry)
  if (nextValue !== currentValue) {
    purged[PROJECTS_REGISTRY_KEY] = nextValue
    const next = purgeDeletedProjectsFromStorage(purged)
    await persistPurgedStore(next)
    return next
  }

  return purgeDeletedProjectsFromStorage(purged)
}

export async function replaceSharedStorage(incomingStorage = {}) {
  return enqueueWrite(async () => {
    const storage = emptySharedStorage()
    for (const key of SHARED_STORAGE_KEYS) {
      if (typeof incomingStorage[key] === "string") {
        storage[key] = incomingStorage[key]
      }
    }

    if (shouldReadLiveSite()) {
      try {
        const response = await fetch(LIVE_SHARED_STORAGE_URL, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replace: true, storage }),
        })
        if (response.ok) {
          const data = await response.json()
          const next = data.storage && typeof data.storage === "object" ? data.storage : storage
          setMemoryStore(next)
          await writeDiskStore(next)
          return next
        }
      } catch {
        // Fall through to local persistence when the live site is unreachable.
      }
    }

    setMemoryStore(storage)
    await persistStore(storage)

    let postgresKeys = []
    try {
      postgresKeys = Object.keys((await readPostgresStore()) ?? {})
    } catch {
      postgresKeys = []
    }

    for (const key of postgresKeys) {
      if (!SHARED_STORAGE_KEYS.includes(key)) {
        try {
          await deletePostgresValue(key)
        } catch {
          // Continue replacing the known shared keys.
        }
      }
    }

    for (const key of SHARED_STORAGE_KEYS) {
      try {
        await upsertPostgresValue(key, storage[key])
      } catch {
        // File/memory storage still holds the replacement.
      }
    }

    return storage
  })
}

export async function writeSharedValue(key, incomingValue, options = {}) {
  const replace = options.replace === true

  return enqueueWrite(async () => {
    if (shouldReadLiveSite()) {
      try {
        const response = await fetch(LIVE_SHARED_STORAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: incomingValue, replace }),
        })
        if (response.ok) {
          const data = await response.json()
          if (typeof data.value === "string") {
            const storage = { ...memoryStore(), [key]: data.value }
            setMemoryStore(storage)
            await writeDiskStore(storage)
            return data.value
          }
        }
      } catch {
        // Fall through to local persistence when the live site is unreachable.
      }
    }

    const storage = await loadStore()
    const extraDeleted = collectDeletedProjectIds(storage, {
      [PROJECTS_REGISTRY_KEY]: key === PROJECTS_REGISTRY_KEY ? incomingValue : storage[PROJECTS_REGISTRY_KEY],
      [DELETED_PROJECT_IDS_KEY]:
        key === DELETED_PROJECT_IDS_KEY ? incomingValue : storage[DELETED_PROJECT_IDS_KEY],
    })

    if (key === DELETED_PROJECT_IDS_KEY) {
      storage[key] = JSON.stringify(
        mergeDeletedProjectIdLists(storage[key], incomingValue, extraDeleted)
      )
    } else if (replace) {
      storage[key] = incomingValue
    } else {
      storage[key] = mergeSharedStorageValue(key, storage[key], incomingValue)
    }

    const next = applyDeletedProjectIds(storage, extraDeleted)
    await persistPurgedStore(next)
    return next[key]
  })
}

export async function removeSharedValue(key) {
  return enqueueWrite(async () => {
    if (shouldReadLiveSite()) {
      try {
        const response = await fetch(LIVE_SHARED_STORAGE_URL, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        })
        if (response.ok) {
          const storage = memoryStore()
          delete storage[key]
          setMemoryStore(storage)
          await writeDiskStore(storage)
          return
        }
      } catch {
        // Fall through to local persistence when the live site is unreachable.
      }
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
