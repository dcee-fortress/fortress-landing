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
  "unitPrice",
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

function isMemoryEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return (
    "text" in value ||
    "lastUsed" in value ||
    "usageCount" in value ||
    "plants" in value ||
    MEMORY_FIELDS.some((key) => key in value)
  )
}

/** Per-project bucket. Legacy flat description keys are ignored (not project-safe). */
function readProjectBucket(store, projectId) {
  if (!projectId) return {}
  const raw = store[projectId]
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || isMemoryEntry(raw)) return {}
  return raw
}

function hasUsefulBuildUpData(row) {
  if (!row || typeof row !== "object") return false
  return MEMORY_FIELDS.some((key) => String(row[key] ?? "").trim() !== "")
}

function snapshotFieldsFromRow(row) {
  const snapshot = {}
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

function snapshotFromRow(row) {
  return {
    text: String(row?.activityDescription ?? "").trim(),
    lastUsed: new Date().toISOString(),
    ...snapshotFieldsFromRow(row),
  }
}

function snapshotPlant(row) {
  return {
    ...snapshotFieldsFromRow(row),
    plantName: row?.plantName ?? "",
    activityDescription: String(row?.activityDescription ?? "").trim(),
  }
}

function isNonEmpty(value) {
  return value !== null && value !== undefined && String(value).trim() !== ""
}

/** Look up remembered build-up for one project + BOQ activity description. */
export function getRateBuildUpMemory(projectId, description) {
  const key = normalizeBoqDescription(description)
  if (!projectId || !key) return null
  const entry = readProjectBucket(readStore(), projectId)[key]
  if (!entry || typeof entry !== "object") return null
  return entry
}

/** All remembered build-up snapshots for one project (copy/paste library). */
export function listRateBuildUpMemoryEntries(projectId = null) {
  const store = readStore()
  if (!projectId) return []
  return Object.entries(readProjectBucket(store, projectId))
    .filter(([, entry]) => entry && typeof entry === "object")
    .map(([key, entry]) => ({
      key,
      description: String(entry.text ?? key).trim(),
      entry,
    }))
    .sort((a, b) => String(b.entry.lastUsed ?? "").localeCompare(String(a.entry.lastUsed ?? "")))
}

/**
 * Persist Build-up rows into per-project memory so remove/re-add of the same BOQ
 * description restores Daily Cost, Daily Production, plant kids, and rate inputs.
 */
export function rememberRateBuildUpRows(projectId, rows) {
  if (typeof window === "undefined" || !projectId) return Promise.resolve()

  const store = readStore()
  const bucket = { ...readProjectBucket(store, projectId) }
  let changed = false

  const list = rows ?? []
  for (const row of list) {
    if (row?.isPlantSubRow || row?.parentId || row?.isGrandTotal) continue
    const plants = list.filter((item) => item?.isPlantSubRow && item.parentId === row.id)
    const grand = list.find((item) => item?.isGrandTotal && item.parentId === row.id) ?? null
    const useful =
      hasUsefulBuildUpData(row) ||
      plants.some((plant) => hasUsefulBuildUpData(plant)) ||
      (grand && hasUsefulBuildUpData(grand))
    if (!useful) continue

    const key = normalizeBoqDescription(row.activityDescription)
    if (!key) continue
    const previous = bucket[key]
    const next = {
      ...(previous && typeof previous === "object" ? previous : {}),
      ...snapshotFromRow(row),
      billNo: String(row.billNo ?? "").trim(),
      unit: String(row.unit ?? previous?.unit ?? "").trim() || undefined,
      plants: plants.map(snapshotPlant),
      ...(grand && hasUsefulBuildUpData(grand)
        ? { grand: snapshotFieldsFromRow(grand) }
        : plants.length > 0
          ? { grand: previous?.grand ?? null }
          : { grand: null }),
      usageCount: (previous?.usageCount ?? 0) + 1,
    }
    bucket[key] = next
    changed = true
  }

  if (!changed) return Promise.resolve()
  store[projectId] = bucket
  return writeStore(store)
}

/**
 * Apply project memory onto a blank / partial Build-up row.
 * Only fills empty fields. Never invents a match for a new description.
 */
export function applyRateBuildUpMemoryToRow(projectId, row) {
  const memory = getRateBuildUpMemory(projectId, row?.activityDescription)
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

/**
 * Expand a memory entry into main + plant + grand rows for a BOQ item that has
 * no live build-up data after remove/re-add.
 */
export function expandRateBuildUpMemoryGroup(projectId, item, mainId) {
  const memory = getRateBuildUpMemory(projectId, item?.itemName ?? item?.activityDescription)
  if (!memory) return null

  const description = String(item?.itemName ?? memory.text ?? "").trim()
  if (!description) return null

  const mainFields = snapshotFieldsFromRow(memory)
  const hasMain = Object.keys(mainFields).length > 0
  const plants = Array.isArray(memory.plants) ? memory.plants.filter(Boolean) : []
  const grandFields =
    memory.grand && typeof memory.grand === "object" ? snapshotFieldsFromRow(memory.grand) : null
  if (!hasMain && plants.length === 0 && !grandFields) return null

  return {
    main: {
      ...mainFields,
      billNo: String(item?.itemNo ?? memory.billNo ?? "").trim(),
      unit: String(item?.unit ?? memory.unit ?? "").trim(),
    },
    plants: plants.map((plant, index) => ({
      ...snapshotFieldsFromRow(plant),
      id: `${mainId}-plant-mem-${index}`,
      parentId: mainId,
      isPlantSubRow: true,
      isGrandTotal: false,
      activityDescription: description,
      plantName: plant.plantName ?? "",
    })),
    grand: grandFields
      ? {
          ...grandFields,
          id: `aca-grand-${mainId}`,
          parentId: mainId,
          isGrandTotal: true,
          isPlantSubRow: false,
          activityDescription: "Grand total",
          unit: String(item?.unit ?? memory.unit ?? "").trim(),
        }
      : null,
  }
}
