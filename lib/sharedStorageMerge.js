import {
  parseRegistryJson,
} from "@/lib/projectCalendarEnsure"

export const PROJECTS_REGISTRY_KEY = "grove-projects-registry"
export const DELETED_PROJECT_IDS_KEY = "grove-deleted-project-ids"
export const STORAGE_UPDATED_AT_KEY = "grove-storage-updated-at"

export const SHARED_STORAGE_KEYS = [
  "grove-primary-project-data",
  "grove-material-schedules",
  "grove-material-schedule-drafts",
  "grove-projects-registry",
  "grove-deleted-project-ids",
  "grove-storage-updated-at",
  "grove-boq",
  "grove-boq-description-memory",
  "grove-plant-cost",
  "grove-plant-hours",
  "grove-equipment-hours",
  "grove-plant-operator-registers",
]

export const RETIRED_PROJECT_IDS = [
  "p-1787899647065",
  "p-1788540769118",
  "p-1788878148584",
  "p-1788870349460",
  "p-1788872553795",
  "p-1788874385472",
  "p-1788874456061",
  "p-1788874834108",
  "p-1788878089689",
  "p-1788934048035",
  "p-1788954486983",
]

export function countRegistryProjects(raw) {
  const value = typeof raw === "string" ? raw : raw?.[PROJECTS_REGISTRY_KEY]
  return (parseRegistryJson(typeof value === "string" ? value : "").projects ?? []).filter(
    (project) => project?.id
  ).length
}

export function keepRicherRegistryValue(localValue, incomingValue, options = {}) {
  const left = parseRegistryJson(typeof localValue === "string" ? localValue : "")
  const right = parseRegistryJson(typeof incomingValue === "string" ? incomingValue : "")
  const leftIds = new Set((left.projects ?? []).map((project) => project?.id).filter(Boolean))
  const rightIds = new Set((right.projects ?? []).map((project) => project?.id).filter(Boolean))
  const incomingIsEmpty = rightIds.size === 0
  if (options.allowEmptyReplace && incomingIsEmpty) {
    const deletedIds = mergeDeletedProjectIdLists(
      left.deletedIds ?? [],
      right.deletedIds ?? [],
      [...leftIds],
      RETIRED_PROJECT_IDS
    )
    return JSON.stringify({ projects: [], files: {}, deletedIds })
  }
  const keepExistingWhenIncomingEmpty = incomingIsEmpty && leftIds.size > 0
  const incomingDeleted = new Set(right.deletedIds ?? [])

  const deletedSet = new Set()
  for (const id of mergeDeletedProjectIdLists(left.deletedIds ?? [], right.deletedIds ?? [], RETIRED_PROJECT_IDS)) {
    if (rightIds.has(id)) continue
    if (leftIds.has(id) && (keepExistingWhenIncomingEmpty || !incomingDeleted.has(id))) continue
    deletedSet.add(id)
  }

  const projectsById = new Map()

  for (const project of left.projects ?? []) {
    if (project?.id && !deletedSet.has(project.id) && !isDemoRecord(project)) {
      projectsById.set(project.id, project)
    }
  }

  for (const project of right.projects ?? []) {
    if (!project?.id || isDemoRecord(project)) continue
    deletedSet.delete(project.id)
    projectsById.set(project.id, { ...projectsById.get(project.id), ...project })
  }

  const files = { ...(left.files ?? {}), ...(right.files ?? {}) }
  for (const id of deletedSet) delete files[id]
  const liveIds = new Set(projectsById.keys())

  return JSON.stringify({
    projects: [...projectsById.values()],
    files,
    deletedIds: [...deletedSet].filter((id) => !liveIds.has(id)),
  })
}

export function scoreSharedStorage(store = {}) {
  if (!store || typeof store !== "object") return 0

  const registry = parseRegistryJson(
    typeof store[PROJECTS_REGISTRY_KEY] === "string" ? store[PROJECTS_REGISTRY_KEY] : ""
  )
  const projectCount = (registry.projects ?? []).filter((project) => project?.id).length
  let bytes = 0
  for (const key of SHARED_STORAGE_KEYS) {
    if (key === PROJECTS_REGISTRY_KEY || key === DELETED_PROJECT_IDS_KEY || key === STORAGE_UPDATED_AT_KEY) continue
    if (typeof store[key] === "string") bytes += store[key].length
  }
  return projectCount * 1_000_000_000 + bytes
}

export function slimProjectsRegistryValue(raw) {
  try {
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}")
    const projects = Array.isArray(parsed.projects) ? parsed.projects.filter((project) => project?.id) : []
    const liveIds = new Set(projects.map((project) => project.id))
    const deletedIds = (Array.isArray(parsed.deletedIds) ? parsed.deletedIds : []).filter(
      (id) => typeof id === "string" && id && !liveIds.has(id)
    )
    return JSON.stringify({
      projects,
      files: {},
      deletedIds,
    })
  } catch {
    return JSON.stringify({ projects: [], files: {}, deletedIds: [] })
  }
}

export function reconcileLiveProjectsWithTombstones(storage = {}) {
  const registry = parseRegistryJson(storage[PROJECTS_REGISTRY_KEY])
  const liveIds = new Set((registry.projects ?? []).map((project) => project?.id).filter(Boolean))
  const deleted = collectDeletedProjectIds(storage).filter((id) => !liveIds.has(id))

  return {
    ...storage,
    [DELETED_PROJECT_IDS_KEY]: JSON.stringify(deleted),
    [PROJECTS_REGISTRY_KEY]: JSON.stringify({
      ...registry,
      deletedIds: deleted,
    }),
  }
}

export function pickRichestSharedStorage(...stores) {
  let best = null
  let bestScore = -1
  for (const store of stores) {
    if (!store || typeof store !== "object") continue
    const score = scoreSharedStorage(store)
    if (score > bestScore) {
      best = store
      bestScore = score
    }
  }
  return best
}

export function parseDeletedProjectIds(raw) {
  if (Array.isArray(raw)) {
    return raw.filter((id) => typeof id === "string" && id)
  }
  if (typeof raw !== "string" || !raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && id) : []
  } catch {
    return []
  }
}

export function mergeDeletedProjectIdLists(...lists) {
  const ids = new Set()
  for (const list of lists) {
    for (const id of parseDeletedProjectIds(list)) ids.add(id)
  }
  return [...ids]
}

export function emptySharedStorage() {
  const storage = {}
  for (const key of SHARED_STORAGE_KEYS) {
    if (key === PROJECTS_REGISTRY_KEY) {
      storage[key] = JSON.stringify({ projects: [], files: {}, deletedIds: [...RETIRED_PROJECT_IDS] })
    } else if (key === DELETED_PROJECT_IDS_KEY) {
      storage[key] = JSON.stringify([...RETIRED_PROJECT_IDS])
    } else if (key === STORAGE_UPDATED_AT_KEY) {
      storage[key] = JSON.stringify({ updatedAt: "1970-01-01T00:00:00.000Z" })
    } else {
      storage[key] = "{}"
    }
  }
  return storage
}

export const DISCARDED_PROJECT_NAMES = ["sync stability test"]

function isDiscardedProjectName(name) {
  return DISCARDED_PROJECT_NAMES.includes(String(name ?? "").trim().toLowerCase())
}

function isDemoRecord(value) {
  if (!value || typeof value !== "object") return false
  if (value.demo === true) return true
  if (isDiscardedProjectName(value.name)) return true
  const id = String(value.id ?? "")
  const details = String(value.details ?? "")
  return id.startsWith("demo-") || details.includes("Local dev sample")
}

export function stripDemoDeep(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => !isDemoRecord(item)).map(stripDemoDeep)
  }
  if (!value || typeof value !== "object") return value
  if (isDemoRecord(value)) return undefined

  if (Array.isArray(value.projects)) {
    const discardedIds = new Set(
      (value.projects ?? [])
        .filter((project) => isDemoRecord(project))
        .map((project) => project?.id)
        .filter(Boolean)
    )
    const projects = (value.projects ?? [])
      .filter((project) => project?.id && !discardedIds.has(project.id))
      .map((project) => stripDemoDeep(project) ?? project)
    const files = { ...(value.files ?? {}) }
    for (const id of discardedIds) delete files[id]
    return {
      ...value,
      projects,
      files,
      deletedIds: [...new Set([...(value.deletedIds ?? []), ...discardedIds].filter(Boolean))],
    }
  }

  const out = {}
  for (const [key, nested] of Object.entries(value)) {
    if (key.startsWith("demo-")) continue
    const next = stripDemoDeep(nested)
    if (next !== undefined) out[key] = next
  }
  return out
}

export function stripDemoSharedValue(raw) {
  if (typeof raw !== "string" || !raw) return raw
  try {
    const parsed = JSON.parse(raw)
    const stripped = stripDemoDeep(parsed)
    return JSON.stringify(stripped ?? (Array.isArray(parsed) ? [] : {}))
  } catch {
    return raw
  }
}

export function stripDemoSharedStorage(storage = {}) {
  const cleaned = {}
  for (const [key, value] of Object.entries(storage)) {
    cleaned[key] = typeof value === "string" ? stripDemoSharedValue(value) : value
  }
  return cleaned
}

function keyBelongsToDeletedProject(key, deletedIds) {
  if (deletedIds.has(key)) return true
  const projectId = String(key).split("::")[0]
  return deletedIds.has(projectId)
}

export function purgeDeletedProjectsFromStorage(storage = {}) {
  const registry = parseRegistryJson(storage[PROJECTS_REGISTRY_KEY])
  const deletedIds = new Set((registry.deletedIds ?? []).filter((id) => typeof id === "string" && id))
  if (deletedIds.size === 0) return storage

  const next = { ...storage }
  if (Array.isArray(registry.projects) || registry.files) {
    const projects = (registry.projects ?? []).filter((project) => !deletedIds.has(project.id))
    const files = { ...(registry.files ?? {}) }
    for (const projectId of deletedIds) {
      delete files[projectId]
    }
    next[PROJECTS_REGISTRY_KEY] = JSON.stringify({
      ...registry,
      deletedIds: [...deletedIds],
      projects,
      files,
    })
  }

  for (const [key, raw] of Object.entries(next)) {
    if (key === PROJECTS_REGISTRY_KEY || typeof raw !== "string") continue
    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue
      let changed = false
      const cleaned = {}
      for (const [nestedKey, value] of Object.entries(parsed)) {
        if (keyBelongsToDeletedProject(nestedKey, deletedIds)) {
          changed = true
          continue
        }
        cleaned[nestedKey] = value
      }
      if (changed) next[key] = JSON.stringify(cleaned)
    } catch {
      // Leave non-JSON values unchanged.
    }
  }

  return next
}

export function collectDeletedProjectIds(...stores) {
  const ids = new Set()
  for (const store of stores) {
    if (!store || typeof store !== "object") continue
    const registry = parseRegistryJson(store[PROJECTS_REGISTRY_KEY])
    for (const id of registry.deletedIds ?? []) {
      if (typeof id === "string" && id) ids.add(id)
    }
    for (const id of parseDeletedProjectIds(store[DELETED_PROJECT_IDS_KEY])) {
      ids.add(id)
    }
  }
  return [...ids]
}

export function applyDeletedProjectIds(storage = {}, extraIds = []) {
  const registry = parseRegistryJson(storage[PROJECTS_REGISTRY_KEY])
  const liveIds = new Set(
    (registry.projects ?? [])
      .map((project) => project?.id)
      .filter((id) => id && !RETIRED_PROJECT_IDS.includes(id))
  )
  const deletedIds = mergeDeletedProjectIdLists(
    registry.deletedIds ?? [],
    storage[DELETED_PROJECT_IDS_KEY],
    extraIds,
    RETIRED_PROJECT_IDS
  ).filter((id) => !liveIds.has(id))
  if (deletedIds.length === 0) {
    return {
      ...storage,
      [DELETED_PROJECT_IDS_KEY]: "[]",
      [PROJECTS_REGISTRY_KEY]: JSON.stringify({
        ...registry,
        deletedIds: [],
      }),
    }
  }

  return purgeDeletedProjectsFromStorage({
    ...storage,
    [DELETED_PROJECT_IDS_KEY]: JSON.stringify(deletedIds),
    [PROJECTS_REGISTRY_KEY]: JSON.stringify({
      ...registry,
      deletedIds,
    }),
  })
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`
}

export function jsonValuesEqual(a, b) {
  if (a === b) return true
  if (typeof a !== "string" || typeof b !== "string") return false
  try {
    return stableStringify(JSON.parse(a)) === stableStringify(JSON.parse(b))
  } catch {
    return false
  }
}

export function parseStorageUpdatedAt(raw) {
  if (typeof raw !== "string" || !raw) return 0
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.updatedAt === "string") {
      return Date.parse(parsed.updatedAt) || 0
    }
  } catch {
    // Raw ISO timestamps are also accepted.
  }
  return Date.parse(raw) || 0
}

export function stampStorageUpdatedAt(iso = new Date().toISOString()) {
  return JSON.stringify({ updatedAt: iso })
}

export function parseJsonObject(value) {
  if (typeof value !== "string" || !value) return null

  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function mergeArrayValues(existing, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return Array.isArray(existing) ? existing : incoming
  }
  if (!Array.isArray(existing) || existing.length === 0) {
    return incoming
  }

  const merged = [...existing]
  const seen = new Set(existing.map((item) => JSON.stringify(item)))
  for (const item of incoming) {
    const signature = JSON.stringify(item)
    if (seen.has(signature)) continue
    seen.add(signature)
    merged.push(item)
  }
  return merged
}

function mergeProjectKeyedStores(existing, incoming) {
  const result = { ...existing }

  for (const [projectId, incomingValue] of Object.entries(incoming)) {
    const previous = result[projectId]
    if (Array.isArray(previous) || Array.isArray(incomingValue)) {
      result[projectId] = mergeArrayValues(previous, incomingValue)
      continue
    }
    if (
      previous &&
      incomingValue &&
      typeof previous === "object" &&
      typeof incomingValue === "object"
    ) {
      result[projectId] = { ...previous, ...incomingValue }
    } else if (incomingValue !== undefined && incomingValue !== null) {
      result[projectId] = incomingValue
    }
  }

  return result
}

function mergeArrayByIdentity(existing, incoming) {
  const left = Array.isArray(existing) ? existing : []
  const right = Array.isArray(incoming) ? incoming : []
  if (left.length === 0) return right
  if (right.length === 0) return left

  const hasIds = [...left, ...right].some((item) => item && typeof item === "object" && item.id)
  if (!hasIds) {
    return mergeArrayValues(left, right)
  }

  const byId = new Map()
  for (const item of right) {
    if (item?.id) byId.set(String(item.id), item)
  }
  for (const item of left) {
    if (item?.id) byId.set(String(item.id), item)
  }

  const seen = new Set()
  const merged = []
  for (const item of left) {
    const id = item?.id != null ? String(item.id) : null
    if (!id) {
      merged.push(item)
      continue
    }
    if (seen.has(id)) continue
    seen.add(id)
    merged.push(byId.get(id))
  }
  for (const item of right) {
    const id = item?.id != null ? String(item.id) : null
    if (!id || seen.has(id)) continue
    seen.add(id)
    merged.push(item)
  }
  return merged
}

function mergeSnapshotStores(existing, incoming) {
  const result = { ...existing }

  for (const [key, incomingValue] of Object.entries(incoming)) {
    const previous = result[key]
    if (Array.isArray(incomingValue) || Array.isArray(previous)) {
      result[key] = mergeArrayByIdentity(previous, incomingValue)
      continue
    }
    if (
      previous &&
      incomingValue &&
      typeof previous === "object" &&
      typeof incomingValue === "object"
    ) {
      result[key] = mergeSnapshotStores(previous, incomingValue)
      continue
    }
    if (incomingValue !== undefined) {
      result[key] = incomingValue
    }
  }

  return result
}

export const SNAPSHOT_STORAGE_KEYS = new Set([
  "grove-material-schedules",
  "grove-material-schedule-drafts",
  "grove-primary-project-data",
  "grove-plant-cost",
  "grove-plant-hours",
  "grove-equipment-hours",
  "grove-boq",
  "grove-boq-description-memory",
  "grove-plant-operator-registers",
])

export function mergeSharedStorageValue(key, existingValue, incomingValue) {
  if (typeof incomingValue === "string") {
    incomingValue = stripDemoSharedValue(incomingValue)
  }
  if (typeof existingValue === "string") {
    existingValue = stripDemoSharedValue(existingValue)
  }

  if (typeof incomingValue !== "string") {
    return typeof existingValue === "string" ? existingValue : incomingValue
  }

  if (typeof existingValue !== "string") {
    return incomingValue
  }

  if (key === DELETED_PROJECT_IDS_KEY) {
    return JSON.stringify(mergeDeletedProjectIdLists(existingValue, incomingValue))
  }

  if (key === PROJECTS_REGISTRY_KEY) {
    return keepRicherRegistryValue(existingValue, incomingValue)
  }

  const existing = parseJsonObject(existingValue)
  const incoming = parseJsonObject(incomingValue)
  if (!existing) return incomingValue
  if (!incoming) return existingValue

  if (SNAPSHOT_STORAGE_KEYS.has(key)) {
    return JSON.stringify(mergeSnapshotStores(existing, incoming))
  }

  return JSON.stringify(mergeProjectKeyedStores(existing, incoming))
}

export function mergeSharedStorageMaps(existingStorage = {}, incomingStorage = {}) {
  const merged = { ...stripDemoSharedStorage(existingStorage) }

  for (const [key, incomingValue] of Object.entries(incomingStorage)) {
    merged[key] = mergeSharedStorageValue(key, merged[key], incomingValue)
  }

  const deletedIds = collectDeletedProjectIds(existingStorage, incomingStorage, merged)
  return applyDeletedProjectIds(stripDemoSharedStorage(merged), deletedIds)
}
