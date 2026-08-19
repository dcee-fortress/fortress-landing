import { keywordScore } from "@/lib/textMatch"

export const BOQ_DESCRIPTION_MEMORY_KEY = "grove-boq-description-memory"

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(BOQ_DESCRIPTION_MEMORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(BOQ_DESCRIPTION_MEMORY_KEY, JSON.stringify(store))
}

function normalizeKey(text) {
  return String(text ?? "").trim().toLowerCase()
}

function getProjectEntries(projectId) {
  const store = readStore()
  return store[projectId] ?? {}
}

function scoreSuggestion(query, text) {
  const trimmedQuery = String(query ?? "").trim()
  const trimmedText = String(text ?? "").trim()

  if (!trimmedText) return 0
  if (!trimmedQuery) return 0.5

  const normalizedQuery = normalizeKey(trimmedQuery)
  const normalizedText = normalizeKey(trimmedText)

  if (normalizedText === normalizedQuery) return 1
  if (normalizedText.startsWith(normalizedQuery)) return 0.95
  if (normalizedText.includes(normalizedQuery)) return 0.85

  return keywordScore(trimmedQuery, trimmedText)
}

export function rememberDescriptions(projectId, descriptions, source = "boq") {
  if (typeof window === "undefined" || !projectId) return

  const texts = (descriptions ?? [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)

  if (texts.length === 0) return

  const store = readStore()
  const entries = { ...(store[projectId] ?? {}) }

  for (const text of texts) {
    const key = normalizeKey(text)
    const existing = entries[key]

    entries[key] = {
      text,
      usageCount: (existing?.usageCount ?? 0) + 1,
      sources: [...new Set([...(existing?.sources ?? []), source])],
      lastUsed: new Date().toISOString(),
    }
  }

  store[projectId] = entries
  writeStore(store)
}

export function rememberBoqDescriptions(projectId, descriptions) {
  rememberDescriptions(projectId, descriptions, "boq")
}

export function rememberMaterialScheduleDescriptions(projectId, descriptions) {
  rememberDescriptions(projectId, descriptions, "schedule")
}

export function getStoredDescriptions(projectId) {
  const entries = getProjectEntries(projectId)
  return Object.values(entries)
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount
      }

      return String(right.lastUsed).localeCompare(String(left.lastUsed))
    })
    .map((entry) => entry.text)
}

export function searchDescriptionSuggestions(
  projectId,
  query,
  { extraDescriptions = [], limit = 8 } = {}
) {
  const candidates = new Map()

  for (const text of getStoredDescriptions(projectId)) {
    candidates.set(normalizeKey(text), text)
  }

  for (const text of extraDescriptions) {
    const trimmed = String(text ?? "").trim()
    if (trimmed) {
      candidates.set(normalizeKey(trimmed), trimmed)
    }
  }

  const ranked = [...candidates.values()]
    .map((text) => ({
      text,
      score: scoreSuggestion(query, text),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.text.localeCompare(right.text)
    })

  const trimmedQuery = String(query ?? "").trim()

  if (!trimmedQuery) {
    return ranked.slice(0, limit).map((item) => item.text)
  }

  return ranked
    .filter((item) => item.score >= 0.2)
    .slice(0, limit)
    .map((item) => item.text)
}

export function removeDescriptionMemoryForProject(projectId) {
  if (typeof window === "undefined") return

  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllDescriptionMemory() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(BOQ_DESCRIPTION_MEMORY_KEY)
}
