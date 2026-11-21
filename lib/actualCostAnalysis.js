import { flushGroveStoreSnapshot } from "@/lib/groveClientStore"
import {
  getBoqById,
  getProjectBoqs,
  normalizeBoqDescription,
  updateProjectBoqItems,
} from "@/lib/boqData"
import { sanitizeBoqItemDescription } from "@/lib/boqNumberedRows"
import { evaluateFormula, isFormula } from "@/lib/materialScheduleFormulas"
import { calculateDailyPlantCost } from "@/lib/plantCostData"
import {
  calculateDailyRate,
  calculateFuelCost,
  parsePlantCostAmount,
  roundMaterialAmount,
} from "@/lib/plantCostCalculations"
import {
  applyRateBuildUpMemoryToRow,
  rememberRateBuildUpRows,
} from "@/lib/rateBuildUpMemory"
import { createLocalStorageCache } from "@/lib/storageCache"
import { getZimBuildSuggestion } from "@/lib/zimBuildQs"

export const ACTUAL_COST_ANALYSIS_STORAGE_KEY = "grove-actual-cost-analysis"

const storeCache = createLocalStorageCache(ACTUAL_COST_ANALYSIS_STORAGE_KEY, {})

function readStore() {
  const store = storeCache.read()
  return store && typeof store === "object" ? store : {}
}

function writeStore(store) {
  return storeCache.write(store)
}

function numberFrom(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null
  if (isFormula(value)) return evaluateFormula(value)
  return parsePlantCostAmount(value)
}

function numberFromRow(row, key) {
  const formula = row?.[`${key}Formula`]
  if (isFormula(formula)) return evaluateFormula(formula)
  return numberFrom(row?.[key])
}

function costTotal(parts) {
  if (parts.every((value) => value == null)) return null
  return roundMaterialAmount(parts.reduce((sum, value) => sum + (value ?? 0), 0))
}

function percentOf(base, percent) {
  if (base == null || percent == null) return null
  return roundMaterialAmount(base * (Number(percent) / 100))
}

export const RATE_BUILD_UP_COLUMNS = [
  { key: "activityDescription", label: "Activity description", align: "left" },
  { key: "plantName", label: "Plant name", align: "left" },
  { key: "fuelAllocated", label: "Fuel allocated", align: "right", numeric: true },
  { key: "fuelPrice", label: "Fuel price", align: "right", numeric: true },
  { key: "fuelCost", label: "Fuel cost", align: "right", numeric: true, computed: true },
  { key: "plantHire", label: "Plant hire", align: "right", numeric: true },
  { key: "plantCost", label: "Plant cost", align: "right", numeric: true, computed: true },
  { key: "laborCost", label: "Labor cost", align: "right", numeric: true },
  { key: "materialDescription", label: "Material description", align: "left" },
  { key: "materialUnit", label: "Unit", align: "left" },
  { key: "materialQty", label: "Material qty", align: "right", numeric: true },
  { key: "unitPrice", label: "Unit price", align: "right", numeric: true },
  { key: "materialCost", label: "Material cost", align: "right", numeric: true, computed: true },
  { key: "totalCost", label: "Total cost", align: "right", numeric: true, computed: true },
  { key: "unit", label: "Unit", align: "left" },
  { key: "production", label: "Daily production", align: "right", numeric: true },
  { key: "rate", label: "Actual rate", align: "right", numeric: true, computed: true },
  { key: "overheads", label: "Overheads", align: "right", numeric: true, percent: true },
  { key: "profit", label: "Profit", align: "right", numeric: true, percent: true },
  { key: "billRate", label: "Bill rate", align: "right", numeric: true, computed: true },
  { key: "allowablePercentage", label: "Allowable percentage", align: "right", numeric: true, percent: true },
  { key: "allowableRate", label: "Allowable rate", align: "right", numeric: true, computed: true },
]

/** Text / descriptive columns — always wrap in the UI. */
export const RATE_BUILD_UP_TEXT_KEYS = new Set([
  "activityDescription",
  "plantName",
  "materialDescription",
  "materialUnit",
  "unit",
])

/** Migrate legacy editable materialCost → unitPrice (material cost is now qty × unit price). */
export function migrateMaterialCostFields(row) {
  if (!row || typeof row !== "object") return row
  const hasUnitPrice = String(row.unitPrice ?? "").trim() !== ""
  const legacyCost = String(row.materialCost ?? "").trim()
  if (hasUnitPrice || !legacyCost) {
    return {
      ...row,
      unitPrice: row.unitPrice ?? "",
    }
  }
  return {
    ...row,
    unitPrice: row.materialCost,
    unitPriceFormula: row.materialCostFormula ?? "",
    materialCost: "",
    materialCostFormula: "",
  }
}

export function emptyActualCostAnalysisRow(item) {
  const description = String(item?.itemName ?? "").trim()
  return {
    id: item?.id || `aca-${normalizeBoqDescription(description).replace(/\s+/g, "-") || "item"}`,
    activityDescription: description,
    details: "",
    plantName: "",
    fuelAllocated: "",
    fuelPrice: "",
    fuelCost: "",
    plantHire: "",
    laborCost: "",
    plantCost: "",
    materialDescription: "",
    materialUnit: "",
    materialQty: "",
    unitPrice: "",
    materialCost: "",
    totalCost: "",
    unit: String(item?.unit ?? "").trim(),
    production: "",
    rate: "",
    overheads: "",
    profit: "",
    allowablePercentage: "",
  }
}

/** Cost columns shown on plant detail rows (rates live on Grand total). */
export const PLANT_COST_COLUMN_KEYS = new Set([
  "plantName",
  "fuelAllocated",
  "fuelPrice",
  "fuelCost",
  "plantHire",
  "plantCost",
  "laborCost",
  "materialDescription",
  "materialUnit",
  "materialQty",
  "unitPrice",
  "materialCost",
  "totalCost",
])

/** Rate / production columns — only on a lone main row or its Grand total. */
export const RATE_COLUMN_KEYS = new Set([
  "unit",
  "production",
  "rate",
  "overheads",
  "profit",
  "billRate",
  "allowablePercentage",
  "allowableRate",
])

/** Extra plant line under a BOQ description — cost columns only in the UI. */
export function createPlantSubRow(parentRow) {
  const description = String(parentRow?.activityDescription ?? "").trim()
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  return {
    ...emptyActualCostAnalysisRow({
      id: `aca-plant-${stamp}`,
      itemName: description,
      unit: "",
    }),
    parentId: parentRow?.id,
    isPlantSubRow: true,
    isGrandTotal: false,
    activityDescription: description,
    unit: "",
    production: "",
    overheads: "",
    profit: "",
    allowablePercentage: "",
  }
}

/** Aggregates all plant/main costs; holds production + rate inputs for the group. */
export function createGrandTotalRow(parentRow) {
  const description = String(parentRow?.activityDescription ?? "").trim()
  return {
    ...emptyActualCostAnalysisRow({
      id: `aca-grand-${parentRow?.id || "item"}`,
      itemName: description,
      unit: parentRow?.unit,
    }),
    parentId: parentRow?.id,
    isPlantSubRow: false,
    isGrandTotal: true,
    activityDescription: "Grand total",
    plantName: "",
    unit: String(parentRow?.unit ?? "").trim(),
    production: String(parentRow?.production ?? "").trim(),
    productionFormula: parentRow?.productionFormula ?? "",
    overheads: String(parentRow?.overheads ?? "").trim(),
    overheadsFormula: parentRow?.overheadsFormula ?? "",
    profit: String(parentRow?.profit ?? "").trim(),
    profitFormula: parentRow?.profitFormula ?? "",
    allowablePercentage: String(parentRow?.allowablePercentage ?? "").trim(),
    allowablePercentageFormula: parentRow?.allowablePercentageFormula ?? "",
  }
}

export function isGrandTotalRow(row) {
  return Boolean(row?.isGrandTotal)
}

export function isPlantSubRow(row) {
  if (isGrandTotalRow(row)) return false
  return Boolean(row?.isPlantSubRow || row?.parentId)
}

export function parentHasPlantRows(rows, parentId) {
  if (!parentId) return false
  return (rows ?? []).some((row) => isPlantSubRow(row) && row.parentId === parentId)
}

/** Clear rate fields on the main row once a Grand total owns them. */
export function stripRateFieldsFromRow(row) {
  if (!row) return row
  return {
    ...row,
    production: "",
    productionFormula: "",
    overheads: "",
    overheadsFormula: "",
    profit: "",
    profitFormula: "",
    allowablePercentage: "",
    allowablePercentageFormula: "",
  }
}

export function listBoqAnalysisItems(projectId) {
  const seen = new Set()
  const items = []
  for (const boq of getProjectBoqs(projectId)) {
    for (const item of boq.items ?? []) {
      const description = String(item?.itemName ?? "").trim()
      const itemNo = String(item?.itemNo ?? "").trim()
      const key = `${itemNo}::${normalizeBoqDescription(description)}`
      if (!normalizeBoqDescription(description) || seen.has(key)) continue
      seen.add(key)
      items.push(item)
    }
  }
  return items
}

/** BOQ line items for one uploaded file only. */
export function listBoqAnalysisItemsForBoq(projectId, boqId) {
  const boq = getBoqById(projectId, boqId)
  if (!boq) return []
  const seen = new Set()
  const items = []
  for (const item of boq.items ?? []) {
    const description = String(item?.itemName ?? "").trim()
    const itemNo = String(item?.itemNo ?? "").trim()
    const key = `${itemNo}::${normalizeBoqDescription(description)}`
    if (!normalizeBoqDescription(description) || seen.has(key)) continue
    seen.add(key)
    items.push(item)
  }
  return items
}

/** Index rate build-up groups from every project (by normalized description). */
export function indexRateBuildUpGroupsByDescription() {
  const store = readStore()
  const index = new Map()
  for (const [projectId, rows] of Object.entries(store ?? {})) {
    if (!Array.isArray(rows)) continue
    const mains = rows.filter((row) => !isPlantSubRow(row) && !isGrandTotalRow(row))
    for (const main of mains) {
      const key = normalizeBoqDescription(main?.activityDescription)
      if (!key) continue
      const plants = rows.filter((row) => isPlantSubRow(row) && row.parentId === main.id)
      const grand = rows.find((row) => isGrandTotalRow(row) && row.parentId === main.id) ?? null
      const hasData = rowHasBuildUpInputs(main) || plants.some(rowHasBuildUpInputs) || Boolean(grand)
      if (!hasData) continue
      const existing = index.get(key)
      // Prefer groups that already have plant rows / more filled fields.
      if (
        !existing ||
        plants.length > (existing.plants?.length ?? 0) ||
        (plants.length === (existing.plants?.length ?? 0) && projectId === existing.projectId)
      ) {
        index.set(key, { projectId, main, plants, grand })
      }
    }
  }
  return index
}

/**
 * Build a Rate build-up table for one saved BOQ file — same shape as the live template.
 * Fills from that project's (and any matching) stored build-ups + memory.
 */
export function buildRateBuildUpRowsForBoq(projectId, boqId) {
  const items = listBoqAnalysisItemsForBoq(projectId, boqId)
  if (items.length === 0) return []

  const localRows = readActualCostAnalysisRows(projectId)
  const localIndex = new Map()
  for (const row of localRows) {
    if (isPlantSubRow(row) || isGrandTotalRow(row)) continue
    const key = normalizeBoqDescription(row?.activityDescription)
    if (!key) continue
    localIndex.set(key, {
      main: row,
      plants: localRows.filter((item) => isPlantSubRow(item) && item.parentId === row.id),
      grand: localRows.find((item) => isGrandTotalRow(item) && item.parentId === row.id) ?? null,
    })
  }

  const globalIndex = indexRateBuildUpGroupsByDescription()
  const merged = []

  for (const item of items) {
    const description = String(item.itemName ?? "").trim()
    const key = normalizeBoqDescription(description)
    const local = key ? localIndex.get(key) : null
    const global = key ? globalIndex.get(key) : null
    const localHasData =
      local &&
      (rowHasBuildUpInputs(local.main) ||
        (local.plants ?? []).some((plant) => rowHasBuildUpInputs(plant)) ||
        Boolean(local.grand))
    const source = localHasData ? local : global
    const empty = emptyActualCostAnalysisRow(item)
    let main = migrateMaterialCostFields({
      ...empty,
      ...(source?.main ?? {}),
      id: empty.id,
      activityDescription: description,
      unit: String(source?.main?.unit ?? item.unit ?? "").trim(),
      billNo: String(item.itemNo ?? "").trim(),
      parentId: undefined,
      isPlantSubRow: false,
      isGrandTotal: false,
    })
    if (!rowHasBuildUpInputs(main)) {
      main = applyRateBuildUpMemoryToRow(main)
    }

    const plants = (source?.plants ?? []).map((plant, index) =>
      migrateMaterialCostFields({
        ...plant,
        id: `${main.id}-plant-${index}`,
        parentId: main.id,
        isPlantSubRow: true,
        isGrandTotal: false,
        activityDescription: description,
      })
    )

    if (plants.length > 0) {
      const unitKeep = String(main.unit ?? item.unit ?? "").trim()
      main = {
        ...stripRateFieldsFromRow(main),
        unit: unitKeep,
      }
    }
    merged.push(main)
    for (const plant of plants) merged.push(plant)
    if (plants.length > 0) {
      const grandSource = source?.grand
      merged.push(
        migrateMaterialCostFields(
          grandSource
            ? {
                ...grandSource,
                id: `aca-grand-${main.id}`,
                parentId: main.id,
                isGrandTotal: true,
                isPlantSubRow: false,
                activityDescription: "Grand total",
              }
            : createGrandTotalRow(main)
        )
      )
    }
  }

  return merged
}

export function resolveActualCostAnalysisRow(row) {
  const migrated = migrateMaterialCostFields(row)
  const fuelAllocated = numberFromRow(migrated, "fuelAllocated")
  const fuelPrice = numberFromRow(migrated, "fuelPrice")
  const plantHire = numberFromRow(migrated, "plantHire")
  const laborCost = numberFromRow(migrated, "laborCost")
  const materialQty = numberFromRow(migrated, "materialQty")
  const unitPrice = numberFromRow(migrated, "unitPrice")
  // Material cost = material qty × unit price (rolls into total with plant + labour).
  const materialCost =
    materialQty != null && unitPrice != null
      ? roundMaterialAmount(materialQty * unitPrice)
      : materialQty == null && unitPrice != null
        ? unitPrice
        : null
  const production = numberFromRow(migrated, "production")
  const fuelCost = calculateFuelCost(fuelAllocated, fuelPrice)
  // Plant cost = fuel cost + plant hire (feeds Head QS Overview rates).
  const plantCost = calculateDailyPlantCost(fuelCost, plantHire)
  const totalCost = costTotal([laborCost, plantCost, materialCost])
  const actualRate = calculateDailyRate(totalCost, production)
  const overheadPercent = numberFromRow(migrated, "overheads")
  const profitPercent = numberFromRow(migrated, "profit")
  const allowablePercent = numberFromRow(migrated, "allowablePercentage")
  const overheadsAmount = percentOf(totalCost, overheadPercent)
  const profitAmount = percentOf(totalCost, profitPercent)
  const billBase =
    totalCost == null && overheadsAmount == null && profitAmount == null
      ? null
      : (totalCost ?? 0) + (overheadsAmount ?? 0) + (profitAmount ?? 0)
  const billRate = calculateDailyRate(billBase, production)
  const allowableRate =
    billRate != null && allowablePercent != null
      ? roundMaterialAmount(billRate * (allowablePercent / 100) + billRate)
      : null

  return {
    ...migrated,
    resolvedFuelAllocated: fuelAllocated,
    resolvedFuelPrice: fuelPrice,
    resolvedPlantHire: plantHire,
    resolvedPlantCost: plantCost,
    resolvedLaborCost: laborCost,
    resolvedMaterialQty: materialQty,
    resolvedUnitPrice: unitPrice,
    resolvedMaterialCost: materialCost,
    resolvedProduction: production,
    fuelCost: fuelCost ?? null,
    plantCost: plantCost ?? null,
    materialCost: materialCost ?? null,
    totalCost: totalCost ?? null,
    rate: actualRate,
    overheadsAmount,
    profitAmount,
    billRate,
    allowableRate,
  }
}

export function readActualCostAnalysisRows(projectId) {
  if (!projectId) return []
  const stored = readStore()[projectId]
  return Array.isArray(stored) ? stored : []
}

export function saveActualCostAnalysisRows(projectId, rows, { remember = true, syncBoq = false } = {}) {
  if (!projectId || typeof window === "undefined") return Promise.resolve()
  const store = readStore()
  store[projectId] = rows
  const writePromise = writeStore(store)
  if (remember) {
    Promise.resolve(rememberRateBuildUpRows(rows)).catch(() => {})
  }
  if (syncBoq) {
    syncBoqRatesFromBuildUp(projectId)
  }
  return writePromise
}

function rowHasBuildUpInputs(row) {
  if (!row) return false
  return [
    "production",
    "laborCost",
    "plantHire",
    "fuelAllocated",
    "unitPrice",
    "materialCost",
    "materialQty",
    "materialDescription",
    "plantName",
    "overheads",
    "profit",
    "allowablePercentage",
  ].some((key) => String(row[key] ?? "").trim() !== "")
}

function preserveFilled(existingValue, nextValue) {
  const existing = String(existingValue ?? "").trim()
  if (existing !== "") return existingValue
  return nextValue
}

export function mergeActualCostAnalysisWithBoq(projectId, currentRows = readActualCostAnalysisRows(projectId)) {
  const mainsById = new Map()
  const mainsByDescription = new Map()
  const plantSubs = []
  const grandTotals = []
  const claimedMainIds = new Set()

  for (const row of (currentRows ?? []).map(migrateMaterialCostFields)) {
    if (isGrandTotalRow(row)) {
      grandTotals.push(row)
      continue
    }
    if (isPlantSubRow(row)) {
      plantSubs.push(row)
      continue
    }
    if (row?.id) mainsById.set(row.id, row)
    const key = normalizeBoqDescription(row?.activityDescription)
    if (key && !mainsByDescription.has(key)) mainsByDescription.set(key, row)
  }

  const merged = []
  for (const item of listBoqAnalysisItems(projectId)) {
    const description = sanitizeBoqItemDescription(item.itemName ?? "")
    const key = normalizeBoqDescription(description)
    let existing =
      (item.id && mainsById.get(item.id)) ||
      mainsByDescription.get(key) ||
      mainsByDescription.get(normalizeBoqDescription(item.itemName)) ||
      null
    if (!existing && description) {
      for (const row of mainsById.values()) {
        if (sanitizeBoqItemDescription(row?.activityDescription) === description) {
          existing = row
          break
        }
      }
    }
    if (existing?.id) claimedMainIds.add(existing.id)

    const empty = emptyActualCostAnalysisRow({ ...item, itemName: description })
    const keptDescription = sanitizeBoqItemDescription(
      rowHasBuildUpInputs(existing)
        ? preserveFilled(existing?.activityDescription, description)
        : description || String(existing?.activityDescription ?? "").trim()
    )
    const base = migrateMaterialCostFields({
      ...empty,
      ...(existing ?? {}),
      id: existing?.id || item.id || empty.id,
      // Prefer cleaned BOQ text; strip page chrome glued onto older imports.
      activityDescription: keptDescription || description,
      unit: String(existing?.unit ?? "").trim() || String(item.unit ?? "").trim(),
      // Daily production is never the BOQ cumulative quantity — keep what the user entered.
      production: String(existing?.production ?? "").trim(),
      parentId: undefined,
      isPlantSubRow: false,
      userAdded: Boolean(existing?.userAdded || item.userAdded),
      isGrandTotal: false,
      billNo: String(item.itemNo ?? existing?.billNo ?? "").trim(),
    })

    // Vector Memory: auto-fill ONLY empty fields when the row has no build-up inputs yet.
    const withMemory = rowHasBuildUpInputs(base) ? base : applyRateBuildUpMemoryToRow(base)
    const zimBuild = getZimBuildSuggestion(description)
    const kids = plantSubs.filter(
      (sub) =>
        sub.parentId === (existing?.id || withMemory.id) ||
        sub.parentId === withMemory.id ||
        (!sub.parentId &&
          normalizeBoqDescription(sub.activityDescription) === key) ||
        (existing?.id && sub.parentId === existing.id)
    )

    const existingGrand =
      kids.length > 0
        ? grandTotals.find(
            (grand) =>
              grand.parentId === (existing?.id || withMemory.id) ||
              grand.parentId === withMemory.id ||
              (existing?.id && grand.parentId === existing.id)
          ) ?? null
        : null

    let main = {
      ...withMemory,
      zimBuildSuggestion: zimBuild,
      parentId: undefined,
      isPlantSubRow: false,
      isGrandTotal: false,
    }
    // Only hide rate fields on the main row in the UI when plant kids exist —
    // never wipe values that already live on the Grand total during merge.
    if (kids.length > 0 && !existingGrand) {
      const unitKeep = String(main.unit ?? item.unit ?? "").trim()
      main = {
        ...stripRateFieldsFromRow(main),
        unit: unitKeep,
      }
    } else if (kids.length > 0) {
      // Grand already owns rates — leave main rate fields as stored (often empty).
      main = { ...main, unit: String(main.unit ?? item.unit ?? "").trim() }
    }
    merged.push(main)

    for (const kid of kids) {
      merged.push(
        migrateMaterialCostFields({
          ...kid,
          parentId: main.id,
          isPlantSubRow: true,
          isGrandTotal: false,
          activityDescription: description || kid.activityDescription,
        })
      )
    }

    if (kids.length > 0) {
      const grand = existingGrand
        ? migrateMaterialCostFields({
            ...existingGrand,
            parentId: main.id,
            isGrandTotal: true,
            isPlantSubRow: false,
            activityDescription: "Grand total",
            unit:
              String(existingGrand.unit ?? "").trim() ||
              String(main.unit ?? item.unit ?? "").trim(),
          })
        : createGrandTotalRow({ ...main, ...withMemory, unit: main.unit })
      merged.push(grand)
    }
  }

  // Keep user build-up rows that no longer match a BOQ line so entered cells are not erased.
  for (const [id, row] of mainsById) {
    if (claimedMainIds.has(id)) continue
    if (!rowHasBuildUpInputs(row) && !row.userAdded) continue
    const kids = plantSubs.filter((sub) => sub.parentId === id)
    const grand = grandTotals.find((item) => item.parentId === id) ?? null
    merged.push({
      ...migrateMaterialCostFields(row),
      parentId: undefined,
      isPlantSubRow: false,
      isGrandTotal: false,
    })
    for (const kid of kids) {
      merged.push(
        migrateMaterialCostFields({
          ...kid,
          parentId: id,
          isPlantSubRow: true,
          isGrandTotal: false,
        })
      )
    }
    if (grand) {
      merged.push(
        migrateMaterialCostFields({
          ...grand,
          parentId: id,
          isGrandTotal: true,
          isPlantSubRow: false,
          activityDescription: "Grand total",
        })
      )
    }
  }

  return merged
}

function sumResolvedField(resolvedRows, key) {
  let any = false
  let total = 0
  for (const row of resolvedRows) {
    const value = row?.[key]
    if (value == null || value === "") continue
    const number = Number(value)
    if (!Number.isFinite(number)) continue
    any = true
    total += number
  }
  return any ? roundMaterialAmount(total) : null
}

/** Sum cost rows and apply production / OH / profit from Grand total (or parent). */
export function resolveRateBuildUpGroup(parentRow, plantRows = [], grandTotalRow = null) {
  const group = [parentRow, ...(plantRows ?? [])].filter(Boolean)
  if (group.length === 0) return null
  const resolved = group.map(resolveActualCostAnalysisRow)
  const totalCost = sumResolvedField(resolved, "totalCost")
  const plantCost = sumResolvedField(resolved, "plantCost")
  const laborCost = sumResolvedField(resolved, "resolvedLaborCost")
  const materialCost = sumResolvedField(resolved, "resolvedMaterialCost")
  const rateSource = grandTotalRow || parentRow
  const production = numberFromRow(rateSource, "production")
  const actualRate = calculateDailyRate(totalCost, production)

  const head = resolved[0]
  const overheadPercent = numberFromRow(rateSource, "overheads")
  const profitPercent = numberFromRow(rateSource, "profit")
  const allowablePercent = numberFromRow(rateSource, "allowablePercentage")
  const overheadsAmount = percentOf(totalCost, overheadPercent)
  const profitAmount = percentOf(totalCost, profitPercent)
  const billBase =
    totalCost == null && overheadsAmount == null && profitAmount == null
      ? null
      : (totalCost ?? 0) + (overheadsAmount ?? 0) + (profitAmount ?? 0)
  const billRate = calculateDailyRate(billBase, production)
  const allowableRate =
    billRate != null && allowablePercent != null
      ? roundMaterialAmount(billRate * (allowablePercent / 100) + billRate)
      : null

  return {
    ...head,
    ...(grandTotalRow ?? {}),
    activityDescription: grandTotalRow ? "Grand total" : head.activityDescription,
    unit: String(rateSource?.unit ?? head.unit ?? "").trim(),
    plantCost,
    laborCost,
    materialCost,
    resolvedLaborCost: laborCost,
    resolvedMaterialCost: materialCost,
    resolvedPlantCost: plantCost,
    totalCost,
    rate: actualRate,
    billRate,
    allowableRate,
    resolvedProduction: production,
    fuelCost: null,
  }
}

/** Display resolver for the Grand total row. */
export function resolveGrandTotalRow(grandRow, costRows = []) {
  return resolveRateBuildUpGroup(
    costRows[0] ?? grandRow,
    costRows.slice(1),
    grandRow
  )
}

export function getRateBuildUpRates(projectId, description) {
  if (!projectId || typeof window === "undefined") return null
  const needle = normalizeBoqDescription(description)
  if (!needle) return null
  const rows = readActualCostAnalysisRows(projectId)
  const parent = rows.find(
    (item) =>
      !isPlantSubRow(item) &&
      !isGrandTotalRow(item) &&
      normalizeBoqDescription(item.activityDescription) === needle
  )
  if (!parent) return null
  const plants = rows.filter((item) => isPlantSubRow(item) && item.parentId === parent.id)
  const grand = rows.find((item) => isGrandTotalRow(item) && item.parentId === parent.id) ?? null
  const resolved = resolveRateBuildUpGroup(parent, plants, grand)
  if (!resolved) return null
  return {
    actualRate: resolved.rate ?? null,
    billRate: resolved.billRate ?? null,
    allowableRate: resolved.allowableRate ?? null,
  }
}

export function syncRateBuildUpFromBoq(projectId) {
  const rows = mergeActualCostAnalysisWithBoq(projectId)
  Promise.resolve(saveActualCostAnalysisRows(projectId, rows, { remember: false }))
    .then(() => flushGroveStoreSnapshot())
  return rows
}

/** Actual rate = total cost ÷ production on the rate build up for this description. */
export function getActualCostAnalysisRate(projectId, description) {
  return getRateBuildUpRates(projectId, description)?.actualRate ?? null
}

function boqCostFromRate(rate, quantity) {
  if (rate == null || quantity == null) return null
  const qty = Number(quantity)
  if (!Number.isFinite(qty)) return null
  return roundMaterialAmount(rate * qty)
}

/** Keep the BOQ quantity. Write Build-up rates and Cost = rate × BOQ quantity. */
export function applyRateBuildUpRates(projectId, items) {
  return (items ?? []).map((item) => {
    const built = getRateBuildUpRates(projectId, item?.itemName)
    if (!built) return item
    const billRate = built.billRate ?? null
    const allowableRate = built.allowableRate ?? null
    const actualRate = built.actualRate ?? null
    if (billRate == null && allowableRate == null && actualRate == null) return item

    const fillRate = billRate ?? allowableRate ?? actualRate
    const cost = boqCostFromRate(fillRate, item?.quantity)
    return {
      ...item,
      ...(billRate != null ? { billRate, rate: billRate } : fillRate != null ? { rate: fillRate } : {}),
      ...(allowableRate != null ? { allowableRate } : {}),
      ...(actualRate != null ? { actualRate } : {}),
      ...(cost != null ? { cost } : {}),
    }
  })
}

/** Push Build-up rates + costs into every stored BOQ for this project. */
export function syncBoqRatesFromBuildUp(projectId) {
  if (!projectId || typeof window === "undefined") return

  for (const boq of getProjectBoqs(projectId)) {
    const items = applyRateBuildUpRates(projectId, boq.items)
    updateProjectBoqItems(projectId, boq.id, items)
  }
}
