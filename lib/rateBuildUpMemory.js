import { normalizeBoqDescription } from "@/lib/boqData"
import { createLocalStorageCache } from "@/lib/storageCache"

export const RATE_BUILD_UP_MEMORY_KEY = "grove-rate-build-up-memory"

const MEMORY_FIELDS = [
  "plantName",
  "fuelAllocated",
  "fuelPrice",
  "plantHire",
  "laborCost",
  "materialDescription",
  "materialUnit",
  "materialQty",
  "materialCost",
  "unit",
  "production",
  "overheads",
  "profit",
  "allowablePercentage",
]

const storeCache = createLocalStorageCache(RATE_BUILD_UP_MEMORY_KEY, {})

function readStore() {
  const store = storeCache.read()
  return store && typeof store === "object" ? store : {}
}

function writeStore(store) {
  return storeCache.write(store)
}

function hasUsefulBuildUpData(row) {
  if (!row || typeof row !== "object") return false
  return MEMORY_FIELDS.some((key) => String(row[key] ?? "").trim() !== "")
}

function snapshotFromRow(row) {
  const snapshot = {
    text: String(row?.activityDescription ?? "").trim(),
    lastUsed: new Date().toISOString(),
  }
  for (const key of MEMORY_FIELDS) {
    const value = row?.[key]
    if (value === null || value === undefined) continue
    if (String(value).trim() === "") continue
    snapshot[key] = value
    const formula = row?.[`${key}Formula`]
    if (isNonEmpty(formula)) snapshot[`${key}Formula`] = formula
  }
  return snapshot
}

function isNonEmpty(value) {
  return value !== null && value !== undefined && String(value).trim() !== ""
}

/** Look up Vector Memory for an exact BOQ activity description match. */
export function getRateBuildUpMemory(description) {
  const key = normalizeBoqDescription(description)
  if (!key) return null
  const entry = readStore()[key]
  if (!entry || typeof entry !== "object") return null
  return entry
}

/**
 * Persist Build-up rows into Vector Memory so the next matching BOQ description
 * can auto-fill Daily Cost, Daily Production, and rate inputs.
 */
export function rememberRateBuildUpRows(rows) {
  if (typeof window === "undefined") return Promise.resolve()

  const store = readStore()
  let changed = false

  for (const row of rows ?? []) {
    if (!hasUsefulBuildUpData(row)) continue
    const key = normalizeBoqDescription(row.activityDescription)
    if (!key) continue
    const previous = store[key]
    const next = {
      ...(previous && typeof previous === "object" ? previous : {}),
      ...snapshotFromRow(row),
      usageCount: (previous?.usageCount ?? 0) + 1,
    }
    store[key] = next
    changed = true
  }

  if (!changed) return Promise.resolve()
  return writeStore(store)
}

/**
 * Apply Vector Memory onto a blank / partial Build-up row.
 * Only fills empty fields. Never invents a match for a new description.
 */
export function applyRateBuildUpMemoryToRow(row) {
  const memory = getRateBuildUpMemory(row?.activityDescription)
  if (!memory) {
    return { ...row, memoryFilled: false, memorySource: null }
  }

  const next = { ...row, memoryFilled: true, memorySource: memory }
  for (const key of MEMORY_FIELDS) {
    if (isNonEmpty(next[key])) continue
    if (!isNonEmpty(memory[key])) continue
    next[key] = memory[key]
    const formulaKey = `${key}Formula`
    if (!isNonEmpty(next[formulaKey]) && isNonEmpty(memory[formulaKey])) {
      next[formulaKey] = memory[formulaKey]
    }
  }
  return next
}
