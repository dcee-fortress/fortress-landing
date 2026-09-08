import {
  mergeProjectRegistries,
  parseRegistryJson,
} from "@/lib/projectCalendarEnsure"

export const PROJECTS_REGISTRY_KEY = "grove-projects-registry"

function isDemoRecord(value) {
  if (!value || typeof value !== "object") return false
  if (value.demo === true) return true
  const id = String(value.id ?? "")
  const details = String(value.details ?? "")
  return id.startsWith("demo-") || details.includes("Local dev sample")
}

export function stripDemoDeep(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => !isDemoRecord(item)).map(stripDemoDeep)
  }
  if (value && typeof value === "object") {
    if (isDemoRecord(value)) return undefined
    const out = {}
    for (const [key, nested] of Object.entries(value)) {
      if (key.startsWith("demo-")) continue
      const next = stripDemoDeep(nested)
      if (next !== undefined) out[key] = next
    }
    return out
  }
  return value
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

  if (key === PROJECTS_REGISTRY_KEY) {
    const merged = mergeProjectRegistries(
      parseRegistryJson(existingValue),
      parseRegistryJson(incomingValue)
    )
    return JSON.stringify(merged.registry)
  }

  const existing = parseJsonObject(existingValue)
  const incoming = parseJsonObject(incomingValue)
  if (!existing) return incomingValue
  if (!incoming) return existingValue

  return JSON.stringify(mergeProjectKeyedStores(existing, incoming))
}

export function mergeSharedStorageMaps(existingStorage = {}, incomingStorage = {}) {
  const merged = { ...stripDemoSharedStorage(existingStorage) }

  for (const [key, incomingValue] of Object.entries(incomingStorage)) {
    merged[key] = mergeSharedStorageValue(key, merged[key], incomingValue)
  }

  return purgeDeletedProjectsFromStorage(stripDemoSharedStorage(merged))
}
