import { getProjectBoqs, normalizeBoqDescription } from "@/lib/boqData"
import { evaluateFormula, isFormula } from "@/lib/materialScheduleFormulas"
import {
  calculateDailyRate,
  calculateFuelCost,
  parsePlantCostAmount,
  roundMaterialAmount,
} from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

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
  { key: "date", label: "Date", align: "left" },
  { key: "activityDescription", label: "Activity description", align: "left" },
  { key: "plantName", label: "Plant name", align: "left" },
  { key: "fuelAllocated", label: "Fuel allocated", align: "right", numeric: true },
  { key: "fuelPrice", label: "Fuel price", align: "right", numeric: true },
  { key: "fuelCost", label: "Fuel cost", align: "right", numeric: true, computed: true },
  { key: "plantHire", label: "Plant hire", align: "right", numeric: true },
  { key: "plantCost", label: "Plant cost", align: "right", numeric: true },
  { key: "laborCost", label: "Labor cost", align: "right", numeric: true },
  { key: "materialDescription", label: "Material description", align: "left" },
  { key: "materialUnit", label: "Unit", align: "left" },
  { key: "materialQty", label: "Material qty", align: "right", numeric: true },
  { key: "materialCost", label: "Material cost", align: "right", numeric: true },
  { key: "totalCost", label: "Total cost", align: "right", numeric: true, computed: true },
  { key: "unit", label: "Unit", align: "left" },
  { key: "production", label: "Production", align: "right", numeric: true },
  { key: "rate", label: "Actual rate", align: "right", numeric: true, computed: true },
  { key: "overheads", label: "Overheads", align: "right", numeric: true, percent: true },
  { key: "profit", label: "Profit", align: "right", numeric: true, percent: true },
  { key: "billRate", label: "Bill rate", align: "right", numeric: true, computed: true },
  { key: "allowablePercentage", label: "Allowable percentage", align: "right", numeric: true, percent: true },
  { key: "allowableRate", label: "Allowable rate", align: "right", numeric: true, computed: true },
]

export function emptyActualCostAnalysisRow(item) {
  const description = String(item?.itemName ?? "").trim()
  return {
    id: item?.id || `aca-${normalizeBoqDescription(description).replace(/\s+/g, "-") || "item"}`,
    date: "",
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

export function listBoqAnalysisItems(projectId) {
  const seen = new Set()
  const items = []
  for (const boq of getProjectBoqs(projectId)) {
    for (const item of boq.items ?? []) {
      const description = String(item?.itemName ?? "").trim()
      const key = normalizeBoqDescription(description)
      if (!key || seen.has(key)) continue
      seen.add(key)
      items.push(item)
    }
  }
  return items
}

export function resolveActualCostAnalysisRow(row) {
  const fuelAllocated = numberFromRow(row, "fuelAllocated")
  const fuelPrice = numberFromRow(row, "fuelPrice")
  const plantHire = numberFromRow(row, "plantHire")
  const plantCost = numberFromRow(row, "plantCost")
  const laborCost = numberFromRow(row, "laborCost")
  const materialCost = numberFromRow(row, "materialCost")
  const production = numberFromRow(row, "production")
  const fuelCost = calculateFuelCost(fuelAllocated, fuelPrice)
  const totalCost = costTotal([laborCost, plantCost, materialCost, plantHire, fuelCost])
  const actualRate = calculateDailyRate(totalCost, production)
  const overheadPercent = numberFromRow(row, "overheads")
  const profitPercent = numberFromRow(row, "profit")
  const allowablePercent = numberFromRow(row, "allowablePercentage")
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
    ...row,
    resolvedFuelAllocated: fuelAllocated,
    resolvedFuelPrice: fuelPrice,
    resolvedPlantHire: plantHire,
    resolvedPlantCost: plantCost,
    resolvedLaborCost: laborCost,
    resolvedMaterialCost: materialCost,
    resolvedProduction: production,
    fuelCost: fuelCost ?? null,
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

export function saveActualCostAnalysisRows(projectId, rows) {
  if (!projectId || typeof window === "undefined") return Promise.resolve()
  const store = readStore()
  store[projectId] = rows
  return writeStore(store)
}

function productionFromBoqQuantity(item) {
  if (item?.quantity === null || item?.quantity === undefined || String(item.quantity).trim() === "") {
    return ""
  }
  const quantity = Number(String(item.quantity).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(quantity) ? String(quantity) : ""
}

export function mergeActualCostAnalysisWithBoq(projectId, currentRows = readActualCostAnalysisRows(projectId)) {
  const byDescription = new Map()
  for (const row of currentRows ?? []) {
    const key = normalizeBoqDescription(row?.activityDescription)
    if (key) byDescription.set(key, row)
  }

  return listBoqAnalysisItems(projectId).map((item) => {
    const key = normalizeBoqDescription(item.itemName)
    const existing = byDescription.get(key)
    const boqProduction = productionFromBoqQuantity(item)
    const existingProduction = String(existing?.production ?? "").trim()
    return {
      ...emptyActualCostAnalysisRow(item),
      ...existing,
      id: existing?.id || item.id || emptyActualCostAnalysisRow(item).id,
      activityDescription: String(item.itemName ?? "").trim(),
      unit: String(existing?.unit ?? "").trim() || String(item.unit ?? "").trim(),
      production: existingProduction || boqProduction,
    }
  })
}

export function getRateBuildUpRates(projectId, description) {
  if (!projectId || typeof window === "undefined") return null
  const needle = normalizeBoqDescription(description)
  if (!needle) return null
  const row = readActualCostAnalysisRows(projectId).find(
    (item) => normalizeBoqDescription(item.activityDescription) === needle
  )
  if (!row) return null
  const resolved = resolveActualCostAnalysisRow(row)
  return {
    actualRate: resolved.rate ?? null,
    billRate: resolved.billRate ?? null,
    allowableRate: resolved.allowableRate ?? null,
  }
}

/** Actual rate = total cost ÷ production on the rate build up for this description. */
export function getActualCostAnalysisRate(projectId, description) {
  return getRateBuildUpRates(projectId, description)?.actualRate ?? null
}
