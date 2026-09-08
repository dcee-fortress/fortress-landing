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
  mergeSharedStorageMaps,
  mergeSharedStorageValue,
  parseJsonObject,
  PROJECTS_REGISTRY_KEY,
} from "@/lib/sharedStorageMerge"

const FILE_NAME = "grove-shared-storage.json"
const LOCAL_FILE_NAME = "grove-shared-storage.local.json"

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
    globalThis.__groveSharedStorage = bundledStore()
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
  return bundledStore()
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

function collectProjectIds(storage) {
  const ids = new Set()

  for (const [key, value] of Object.entries(storage)) {
    if (key === PROJECTS_REGISTRY_KEY || typeof value !== "string") continue
    const parsed = parseJsonObject(value)
    if (!parsed) continue

    for (const nestedKey of Object.keys(parsed)) {
      const projectId = nestedKey.split("::")[0]
      if (projectId.startsWith("p-") || projectId === "1") {
        ids.add(projectId)
      }
    }
  }

  return ids
}

function hydrateRegistryProjects(storage) {
  const registry = parseRegistryJson(storage[PROJECTS_REGISTRY_KEY])
  const knownIds = new Set((registry.projects ?? []).map((project) => project.id))
  let changed = false

  for (const projectId of collectProjectIds(storage)) {
    if (knownIds.has(projectId)) continue

    registry.projects = [
      ...(registry.projects ?? []),
      {
        id: projectId,
        name: projectId === "1" ? "Roads" : "Project",
        active: true,
        seeded: projectId === "1",
        status: "active",
        startDate: projectId === "1" || projectId.startsWith("p-") ? "2026-08-28" : undefined,
        endDate: null,
        endedAt: null,
      },
    ]
    knownIds.add(projectId)
    changed = true
  }

  if (!changed) return false

  storage[PROJECTS_REGISTRY_KEY] = JSON.stringify(registry)
  return true
}

async function loadStore() {
  const github = await readGithubSharedStore()
  const disk = await readDiskStore()
  const memory = memoryStore()
  let postgres = null

  try {
    postgres = await readPostgresStore()
  } catch {
    postgres = null
  }

  const merged = mergeSharedStorageMaps(
    mergeSharedStorageMaps(mergeSharedStorageMaps(github ?? {}, disk), memory),
    postgres ?? {}
  )
  setMemoryStore(merged)
  return merged
}

async function persistStore(storage) {
  setMemoryStore(storage)
  await writeDiskStore(storage)
  await writeGithubSharedStore(storage)
}

export async function readSharedStorage() {
  const storage = await loadStore()
  const hydrated = hydrateRegistryProjects(storage)
  const currentValue = storage[PROJECTS_REGISTRY_KEY]
  const { registry, changed } = applyCalendarFilesToRegistry(parseRegistryJson(currentValue))

  if (!changed && !hydrated && typeof currentValue === "string") {
    return storage
  }

  const nextValue = JSON.stringify(registry)
  if (nextValue !== currentValue || hydrated) {
    storage[PROJECTS_REGISTRY_KEY] = nextValue
    await persistStore(storage)
    try {
      await upsertPostgresValue(PROJECTS_REGISTRY_KEY, nextValue)
    } catch {
      // File/memory storage still holds the calendar update.
    }
  }

  return storage
}

export async function writeSharedValue(key, incomingValue) {
  return enqueueWrite(async () => {
    const storage = await loadStore()
    const nextValue = mergeSharedStorageValue(key, storage[key], incomingValue)
    storage[key] = nextValue
    await persistStore(storage)

    try {
      await upsertPostgresValue(key, nextValue)
    } catch {
      // Persist locally even when Postgres is not connected.
    }

    return nextValue
  })
}

export async function removeSharedValue(key) {
  return enqueueWrite(async () => {
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
