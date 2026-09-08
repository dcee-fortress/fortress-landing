import {
  mergeProjectRegistries,
  parseRegistryJson,
} from "@/lib/projectCalendarEnsure"

export const PROJECTS_REGISTRY_KEY = "grove-projects-registry"

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
  const merged = { ...existingStorage }

  for (const [key, incomingValue] of Object.entries(incomingStorage)) {
    merged[key] = mergeSharedStorageValue(key, merged[key], incomingValue)
  }

  return merged
}
