import { parsePlantCostAmount } from "@/lib/plantCostCalculations"

const NUMERIC_COLUMN_KEYS = new Set([
  "fuelAllocated",
  "fuelPrice",
  "fuelCost",
  "plantHire",
  "laborCost",
  "totalCost",
  "production",
  "rate",
])

export function isFormula(value) {
  return typeof value === "string" && value.trim().startsWith("=")
}

function parsePlainNumber(value) {
  if (value === null || value === undefined || value === "") return null
  const parsed = parsePlantCostAmount(value)
  if (parsed !== null) return parsed

  const cleaned = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(cleaned) ? cleaned : null
}

function evaluateMathExpression(expression) {
  const sanitized = String(expression ?? "").replace(/\s/g, "")
  if (!sanitized || !/^[\d+\-*/().]+$/.test(sanitized)) {
    return null
  }

  try {
    const result = Function(`"use strict"; return (${sanitized})`)()
    return Number.isFinite(result) ? Math.round(result * 10000) / 10000 : null
  } catch {
    return null
  }
}

export function evaluateFormula(value) {
  if (!isFormula(value)) {
    return parsePlainNumber(value)
  }

  return evaluateMathExpression(String(value).trim().slice(1))
}

export function commitFormulaInput(draft, numeric = false) {
  const text = String(draft ?? "")

  if (!numeric || !isFormula(text)) {
    return { value: text, formula: "" }
  }

  const formula = text.trim()
  const result = evaluateMathExpression(formula.slice(1))
  if (result === null) {
    return { value: text, formula: text }
  }

  const rounded = Math.round(result * 100) / 100
  return { value: String(rounded), formula }
}

export function resolveNumericField(rawRows, resolvedGrid, rowIndex, columnKey) {
  void resolvedGrid

  const raw = rawRows[rowIndex]?.[columnKey]
  if (raw === undefined || raw === null || raw === "") return null

  return parsePlainNumber(raw)
}

export function buildResolvedNumericGrid(rawRows, computeDerivedValues) {
  const resolvedGrid = rawRows.map(() => ({}))

  for (let pass = 0; pass < 4; pass += 1) {
    for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex += 1) {
      computeDerivedValues(rawRows, resolvedGrid, rowIndex)
    }
  }

  return resolvedGrid
}

export function isNumericMaterialColumn(columnKey) {
  return NUMERIC_COLUMN_KEYS.has(columnKey)
}

export function getMaterialFormulaHelpText() {
  return "Enter a number or a formula with figures only (e.g. =3*4, =100+50). The answer appears in the cell; click the cell to see the formula in the bar above. Auto-calculated fields fill in when left blank."
}

export function formatFormulaResult(value, { currency = false } = {}) {
  if (value === null || value === undefined || value === "") return ""

  const numeric = typeof value === "number" ? value : parsePlainNumber(value)
  if (numeric === null) return String(value)

  if (currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric)
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
}
