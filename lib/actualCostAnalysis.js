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

function costTotal(fuelCost, plantHire, laborCost) {
  if (fuelCost === null && plantHire === null && laborCost === null) return null
  return roundMaterialAmount((fuelCost ?? 0) + (plantHire ?? 0) + (laborCost ?? 0))
}

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
    totalCost: "",
    unit: String(item?.unit ?? "").trim(),
    production: "",
    rate: "",
    allowableRate: item?.allowableRate ?? null,
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
  const laborCost = numberFromRow(row, "laborCost")
  const production = numberFromRow(row, "production")
  const fuelCost = calculateFuelCost(fuelAllocated, fuelPrice)
  const totalCost = costTotal(fuelCost, plantHire, laborCost)
  const rate = calculateDailyRate(totalCost, production)

  return {
    ...row,
    resolvedFuelAllocated: fuelAllocated,
    resolvedFuelPrice: fuelPrice,
    resolvedPlantHire: plantHire,
    resolvedLaborCost: laborCost,
    resolvedProduction: production,
    fuelCost: fuelCost ?? null,
    totalCost: totalCost ?? null,
    rate,
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

export function mergeActualCostAnalysisWithBoq(projectId, currentRows = readActualCostAnalysisRows(projectId)) {
  const byDescription = new Map()
  for (const row of currentRows ?? []) {
    const key = normalizeBoqDescription(row?.activityDescription)
    if (key) byDescription.set(key, row)
  }

  return listBoqAnalysisItems(projectId).map((item) => {
    const key = normalizeBoqDescription(item.itemName)
    const existing = byDescription.get(key)
    return {
      ...emptyActualCostAnalysisRow(item),
      ...existing,
      id: existing?.id || item.id || emptyActualCostAnalysisRow(item).id,
      activityDescription: String(item.itemName ?? "").trim(),
      unit: String(existing?.unit ?? "").trim() || String(item.unit ?? "").trim(),
      allowableRate: item.allowableRate ?? null,
    }
  })
}

/** Rate = analysis total cost ÷ analysis production for this BOQ description. */
export function getActualCostAnalysisRate(projectId, description) {
  if (!projectId || typeof window === "undefined") return null
  const needle = normalizeBoqDescription(description)
  if (!needle) return null
  const row = readActualCostAnalysisRows(projectId).find(
    (item) => normalizeBoqDescription(item.activityDescription) === needle
  )
  if (!row) return null
  return resolveActualCostAnalysisRow(row).rate ?? null
}
