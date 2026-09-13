import { getGroveItem, removeGroveItem } from "@/lib/groveClientStore"
import { isFormula } from "@/lib/materialScheduleFormulas"
import { keywordScore } from "@/lib/textMatch"

export const MATERIAL_FORMULA_MEMORY_KEY = "grove-material-formula-memory"

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = getGroveItem(MATERIAL_FORMULA_MEMORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return Promise.resolve()
  return import("@/lib/saveToPostgres").then(({ writeGroveJson }) =>
    writeGroveJson(MATERIAL_FORMULA_MEMORY_KEY, store, { replace: true })
  )
}

function normalizeKey(text) {
  return String(text ?? "").trim().toLowerCase()
}

function normalizeFormula(formula) {
  return String(formula ?? "").trim()
}

function upsertFormula(projectMemory, { description, columnKey, columnLabel, formula, seed }) {
  const savedFormula = normalizeFormula(formula)
  if (!isFormula(savedFormula) || savedFormula.length < 3) return false
  if (seed && projectMemory[savedFormula]) return false

  const existing = projectMemory[savedFormula] ?? {
    formula: savedFormula,
    usageCount: 0,
    lastUsed: null,
    columns: {},
    descriptions: {},
  }

  const descriptionText = String(description ?? "").trim()
  const descriptionKey = normalizeKey(descriptionText)
  const descriptionEntry = existing.descriptions[descriptionKey] ?? {
    text: descriptionText,
    usageCount: 0,
  }

  const columnEntry = existing.columns[columnKey] ?? {
    key: columnKey,
    label: columnLabel,
    usageCount: 0,
  }

  projectMemory[savedFormula] = {
    formula: savedFormula,
    usageCount: existing.usageCount + (seed ? 0 : 1),
    lastUsed: new Date().toISOString(),
    columns: {
      ...existing.columns,
      ...(columnKey
        ? {
            [columnKey]: {
              ...columnEntry,
              label: columnLabel || columnEntry.label || columnKey,
              usageCount: columnEntry.usageCount + (seed ? 0 : 1),
            },
          }
        : {}),
    },
    descriptions: {
      ...existing.descriptions,
      ...(descriptionKey
        ? {
            [descriptionKey]: {
              text: descriptionText || descriptionEntry.text,
              usageCount: descriptionEntry.usageCount + (seed ? 0 : 1),
              lastUsed: new Date().toISOString(),
            },
          }
        : {}),
    },
  }

  return true
}

export function rememberMaterialFormula({
  projectId,
  description = "",
  columnKey = "",
  columnLabel = "",
  formula,
  seed = false,
}) {
  if (typeof window === "undefined" || !projectId) return

  const store = readStore()
  const projectMemory = { ...(store[projectId] ?? {}) }
  if (!upsertFormula(projectMemory, { description, columnKey, columnLabel, formula, seed })) {
    return
  }

  store[projectId] = projectMemory
  writeStore(store)
}

export function harvestMaterialFormulasFromRows(projectId, rows, columns) {
  if (typeof window === "undefined" || !projectId || !Array.isArray(rows)) return

  const store = readStore()
  const projectMemory = { ...(store[projectId] ?? {}) }
  let changed = false

  for (const row of rows) {
    for (const column of columns ?? []) {
      if (!column?.key || column.key === "activityDescription" || column.key === "details") continue
      const didChange = upsertFormula(projectMemory, {
        description: row.activityDescription,
        columnKey: column.key,
        columnLabel: column.label,
        formula: row?.[`${column.key}Formula`],
        seed: true,
      })
      if (didChange) changed = true
    }
  }

  if (!changed) return
  store[projectId] = projectMemory
  writeStore(store)
}

function descriptionScore(queryDescription, entry) {
  const query = String(queryDescription ?? "").trim()
  const descriptions = Object.values(entry.descriptions ?? {})
  if (descriptions.length === 0) return query ? 0.15 : 0.4

  let best = 0
  for (const item of descriptions) {
    const text = item.text || ""
    if (!query) {
      best = Math.max(best, 0.4)
      continue
    }

    const normalizedQuery = normalizeKey(query)
    const normalizedText = normalizeKey(text)
    if (normalizedText === normalizedQuery) best = Math.max(best, 1)
    else if (normalizedText.includes(normalizedQuery) || normalizedQuery.includes(normalizedText)) {
      best = Math.max(best, 0.86)
    } else {
      best = Math.max(best, keywordScore(query, text))
    }
  }

  return best
}

export function searchMaterialFormulaSuggestions({
  projectId,
  description = "",
  columnKey = "",
  query = "",
  limit = 8,
} = {}) {
  if (typeof window === "undefined" || !projectId) return []

  const typed = normalizeFormula(query)
  if (!typed.startsWith("=")) return []

  const entries = Object.values(readStore()[projectId] ?? {})
  const ranked = entries
    .map((entry) => {
      const formula = normalizeFormula(entry.formula)
      if (!isFormula(formula)) return null

      let score = descriptionScore(description, entry) * 4
      if (columnKey && entry.columns?.[columnKey]) score += 1.5
      score += Math.min(entry.usageCount ?? 0, 8) * 0.08

      if (typed.length > 1) {
        const formulaLower = formula.toLowerCase()
        const typedLower = typed.toLowerCase()
        if (formulaLower === typedLower) score += 5
        else if (formulaLower.startsWith(typedLower)) score += 2.4
        else if (formulaLower.includes(typedLower.slice(1))) score += 1.2
        else score -= 1.5
      }

      const relatedDescription =
        Object.values(entry.descriptions ?? {}).sort(
          (left, right) => (right.usageCount ?? 0) - (left.usageCount ?? 0)
        )[0]?.text || ""
      const relatedColumn =
        entry.columns?.[columnKey]?.label ||
        Object.values(entry.columns ?? {})[0]?.label ||
        ""

      return {
        formula,
        description: relatedDescription,
        columnLabel: relatedColumn,
        score,
      }
    })
    .filter((item) => item && item.score >= 0.35)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return left.formula.localeCompare(right.formula)
    })

  const unique = []
  const seen = new Set()
  for (const item of ranked) {
    if (seen.has(item.formula)) continue
    seen.add(item.formula)
    unique.push(item)
    if (unique.length >= limit) break
  }

  return unique
}

export function removeFormulaMemoryForProject(projectId) {
  if (typeof window === "undefined") return
  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllFormulaMemory() {
  if (typeof window === "undefined") return
  removeGroveItem(MATERIAL_FORMULA_MEMORY_KEY)
}
