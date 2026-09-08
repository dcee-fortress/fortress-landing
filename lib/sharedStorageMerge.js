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

function mergeProjectKeyedStores(existing, incoming) {
  const result = { ...existing }

  for (const [projectId, incomingValue] of Object.entries(incoming)) {
    const previous = result[projectId]
    if (
      previous &&
      incomingValue &&
      typeof previous === "object" &&
      typeof incomingValue === "object" &&
      !Array.isArray(previous) &&
      !Array.isArray(incomingValue)
    ) {
      result[projectId] = { ...previous, ...incomingValue }
    } else {
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
