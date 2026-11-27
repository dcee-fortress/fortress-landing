import {
  createGrandTotalRow,
  createPlantSubRow,
  isGrandTotalRow,
  isPlantSubRow,
  migrateMaterialCostFields,
  parentHasPlantRows,
} from "@/lib/actualCostAnalysis"
import { listRateBuildUpMemoryEntries } from "@/lib/rateBuildUpMemory"
import { createLocalStorageCache } from "@/lib/storageCache"
import { normalizeBoqDescription } from "@/lib/boqData"

export const RATE_BUILD_UP_CLIPBOARD_KEY = "grove-rate-build-up-clipboard"
export const RATE_BUILD_UP_CLIPBOARD_MIME = "application/x-rodcroft-rate-build-up"

const clipboardCache = createLocalStorageCache(RATE_BUILD_UP_CLIPBOARD_KEY, null)

const COPY_FIELDS = [
  "plantName",
  "fuelAllocated",
  "fuelPrice",
  "plantHire",
  "laborCost",
  "materialDescription",
  "materialUnit",
  "materialQty",
  "unitPrice",
  "unit",
  "production",
  "overheads",
  "profit",
  "allowablePercentage",
]

function snapshotRow(row) {
  const migrated = migrateMaterialCostFields(row) || {}
  const snap = {
    activityDescription: String(migrated.activityDescription ?? "").trim(),
  }
  for (const key of COPY_FIELDS) {
    const value = migrated[key]
    if (value === null || value === undefined || String(value).trim() === "") continue
    snap[key] = value
    const formula = migrated[`${key}Formula`]
    if (formula !== null && formula !== undefined && String(formula).trim() !== "") {
      snap[`${key}Formula`] = formula
    }
  }
  return snap
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Bundle a main row + its plant sub-rows (+ optional grand) for copy. */
export function captureRateBuildUpGroup(rows, anchorIndex) {
  const list = rows ?? []
  const anchor = list[anchorIndex]
  if (!anchor || isGrandTotalRow(anchor)) return null

  const parent = isPlantSubRow(anchor)
    ? list.find((row) => row.id === anchor.parentId) ?? null
    : anchor
  if (!parent || isPlantSubRow(parent) || isGrandTotalRow(parent)) return null

  const plants = list.filter((row) => isPlantSubRow(row) && row.parentId === parent.id)
  const grand = list.find((row) => isGrandTotalRow(row) && row.parentId === parent.id) ?? null

  return {
    version: 1,
    type: RATE_BUILD_UP_CLIPBOARD_MIME,
    copiedAt: new Date().toISOString(),
    description: String(parent.activityDescription ?? "").trim(),
    main: snapshotRow(parent),
    plants: plants.map(snapshotRow),
    grand: grand
      ? {
          unit: grand.unit ?? "",
          production: grand.production ?? "",
          productionFormula: grand.productionFormula ?? "",
          overheads: grand.overheads ?? "",
          overheadsFormula: grand.overheadsFormula ?? "",
          profit: grand.profit ?? "",
          profitFormula: grand.profitFormula ?? "",
          allowablePercentage: grand.allowablePercentage ?? "",
          allowablePercentageFormula: grand.allowablePercentageFormula ?? "",
        }
      : null,
  }
}

export function rememberRateBuildUpClipboard(payload) {
  if (!payload) return Promise.resolve()
  return clipboardCache.write(payload)
}

export function readRateBuildUpClipboard() {
  const stored = clipboardCache.read()
  if (!stored || typeof stored !== "object") return null
  if (stored.type !== RATE_BUILD_UP_CLIPBOARD_MIME) return null
  return stored
}

export async function writeClipboardPayload(payload) {
  rememberRateBuildUpClipboard(payload)
  const text = JSON.stringify(payload)
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    }
  } catch {
    // Local store is enough for in-app paste / replace.
  }
  return payload
}

export async function readClipboardPayload() {
  const local = readRateBuildUpClipboard()
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text)
      if (parsed?.type === RATE_BUILD_UP_CLIPBOARD_MIME) {
        rememberRateBuildUpClipboard(parsed)
        return parsed
      }
    }
  } catch {
    // fall through to local
  }
  return local
}

function applySnapshotToRow(row, snap, { keepDescription = false } = {}) {
  const next = { ...row }
  for (const key of COPY_FIELDS) {
    next[key] = snap?.[key] ?? ""
    next[`${key}Formula`] = snap?.[`${key}Formula`] ?? ""
  }
  if (!keepDescription && snap?.activityDescription) {
    next.activityDescription = snap.activityDescription
  }
  return migrateMaterialCostFields(next)
}

/** Replace a main row (and rebuild plant / grand children) from a clipboard payload. */
export function replaceRowGroupFromClipboard(rows, targetIndex, payload) {
  const list = [...(rows ?? [])]
  const target = list[targetIndex]
  if (!target || isGrandTotalRow(target) || !payload?.main) return rows

  const parent = isPlantSubRow(target)
    ? list.find((row) => row.id === target.parentId) ?? target
    : target
  if (!parent?.id) return rows

  const parentIndex = list.findIndex((row) => row.id === parent.id)
  if (parentIndex < 0) return rows

  const withoutKids = list.filter(
    (row) => !(row.parentId === parent.id && (isPlantSubRow(row) || isGrandTotalRow(row)))
  )
  const liveParentIndex = withoutKids.findIndex((row) => row.id === parent.id)
  if (liveParentIndex < 0) return rows

  const main = applySnapshotToRow(withoutKids[liveParentIndex], payload.main, {
    keepDescription: true,
  })
  withoutKids[liveParentIndex] = {
    ...main,
    id: parent.id,
    parentId: undefined,
    isPlantSubRow: false,
    isGrandTotal: false,
  }

  const insertAt = liveParentIndex + 1
  const plants = (payload.plants ?? []).map((snap) => {
    const plant = createPlantSubRow(withoutKids[liveParentIndex])
    return {
      ...applySnapshotToRow(plant, snap),
      id: newId("aca-plant"),
      parentId: parent.id,
      isPlantSubRow: true,
      isGrandTotal: false,
      activityDescription: withoutKids[liveParentIndex].activityDescription,
    }
  })

  let insert = [...plants]
  if (plants.length > 0) {
    const grandBase = createGrandTotalRow(withoutKids[liveParentIndex])
    const grand = {
      ...grandBase,
      ...(payload.grand ?? {}),
      id: `aca-grand-${parent.id}`,
      parentId: parent.id,
      isGrandTotal: true,
      isPlantSubRow: false,
      activityDescription: "Grand total",
    }
    // Rates belong on grand when plants exist.
    withoutKids[liveParentIndex] = {
      ...withoutKids[liveParentIndex],
      production: "",
      productionFormula: "",
      overheads: "",
      overheadsFormula: "",
      profit: "",
      profitFormula: "",
      allowablePercentage: "",
      allowablePercentageFormula: "",
    }
    insert = [...plants, grand]
  } else if (payload.grand) {
    withoutKids[liveParentIndex] = {
      ...withoutKids[liveParentIndex],
      unit: payload.grand.unit || withoutKids[liveParentIndex].unit,
      production: payload.grand.production ?? "",
      productionFormula: payload.grand.productionFormula ?? "",
      overheads: payload.grand.overheads ?? "",
      overheadsFormula: payload.grand.overheadsFormula ?? "",
      profit: payload.grand.profit ?? "",
      profitFormula: payload.grand.profitFormula ?? "",
      allowablePercentage: payload.grand.allowablePercentage ?? "",
      allowablePercentageFormula: payload.grand.allowablePercentageFormula ?? "",
    }
  }

  withoutKids.splice(insertAt, 0, ...insert)
  return withoutKids
}

/** Paste clipboard figures onto a target main row without changing its BOQ description. */
export function pasteOntoRowGroup(rows, targetIndex, payload) {
  return replaceRowGroupFromClipboard(rows, targetIndex, payload)
}

/** List saved memory builds + unique filled groups from the open sheet for the picker. */
export function listRateBuildUpLibrary(rows = [], projectId = null) {
  const library = []
  const seen = new Set()

  for (let index = 0; index < (rows ?? []).length; index += 1) {
    const row = rows[index]
    if (!row || isPlantSubRow(row) || isGrandTotalRow(row)) continue
    const key = normalizeBoqDescription(row.activityDescription)
    if (!key || seen.has(`row:${key}`)) continue
    const payload = captureRateBuildUpGroup(rows, index)
    if (!payload) continue
    const hasData =
      Object.keys(payload.main).some((k) => k !== "activityDescription") ||
      (payload.plants?.length ?? 0) > 0
    if (!hasData) continue
    seen.add(`row:${key}`)
    library.push({
      id: `current-${row.id}`,
      source: "current",
      description: payload.description,
      plantCount: payload.plants?.length ?? 0,
      payload,
    })
  }

  for (const item of listRateBuildUpMemoryEntries(projectId)) {
    const key = normalizeBoqDescription(item.description)
    if (!key || seen.has(`row:${key}`) || seen.has(`memory:${key}`)) continue
    const payload = memoryEntryToClipboardPayload(item.description, item.entry)
    if (!payload) continue
    seen.add(`memory:${key}`)
    library.push({
      id: `memory-${key}`,
      source: "memory",
      description: payload.description,
      plantCount: Array.isArray(item.entry?.plants) ? item.entry.plants.length : 0,
      payload,
    })
  }

  return library
}

export function memoryEntryToClipboardPayload(description, entry) {
  if (!entry || typeof entry !== "object") return null
  const main = { activityDescription: String(description ?? entry.text ?? "").trim() }
  for (const key of COPY_FIELDS) {
    if (entry[key] != null && String(entry[key]).trim() !== "") main[key] = entry[key]
    if (entry[`${key}Formula`]) main[`${key}Formula`] = entry[`${key}Formula`]
  }
  return {
    version: 1,
    type: RATE_BUILD_UP_CLIPBOARD_MIME,
    copiedAt: entry.lastUsed || new Date().toISOString(),
    description: main.activityDescription,
    main,
    plants: [],
    grand: null,
  }
}

export { parentHasPlantRows }
