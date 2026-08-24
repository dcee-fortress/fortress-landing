import { keywordScore } from "@/lib/textMatch"
import { rememberBoqDescriptions } from "@/lib/boqDescriptionMemory"

export const BOQ_STORAGE_KEY = "grove-boq"

const ITEM_HEADER_HINTS = ["item", "description", "activity", "work", "boq"]
const RATE_HEADER_HINTS = ["rate", "unit rate", "price", "cost"]
const QUANTITY_HEADER_HINTS = ["quantity", "qty", "measured", "volume", "amount"]
const UNIT_HEADER_HINTS = ["unit", "uom"]

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(BOQ_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(BOQ_STORAGE_KEY, JSON.stringify(store))
}

function createBoqId() {
  return `boq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeProjectBoqs(stored) {
  if (!stored) return []
  if (Array.isArray(stored.boqs)) return stored.boqs
  if (Array.isArray(stored)) return stored

  if (stored.items && Array.isArray(stored.items)) {
    if (stored.items.length === 0 && !stored.fileName) return []

    return [
      {
        id: stored.id ?? "boq-legacy",
        name: stored.name ?? stored.fileName?.replace(/\.[^.]+$/, "") ?? "BOQ",
        fileName: stored.fileName ?? "",
        uploadedAt: stored.uploadedAt ?? null,
        items: stored.items,
      },
    ]
  }

  return []
}

export function getProjectBoqs(projectId) {
  const store = readStore()
  return normalizeProjectBoqs(store[projectId])
}

export function getBoqById(projectId, boqId) {
  return getProjectBoqs(projectId).find((boq) => boq.id === boqId) ?? null
}

/** @deprecated Use getProjectBoqs */
export function getProjectBoq(projectId) {
  const boqs = getProjectBoqs(projectId)
  const first = boqs[0]

  return first ?? { fileName: "", uploadedAt: null, items: [] }
}

function normalizeBoqItems(items) {
  return items
    .map((item, index) => {
      const itemName = String(item.itemName ?? "").trim()
      const rate = parseRateValue(item.rate)

      if (!itemName || rate === null) {
        return null
      }

      return {
        id:
          item.id ??
          `boq-${index}-${itemName.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
        itemName,
        rate: Math.round(rate * 10000) / 10000,
        ...(item.unit ? { unit: String(item.unit).trim() } : {}),
        ...(item.quantity !== undefined && item.quantity !== null
          ? { quantity: item.quantity }
          : {}),
      }
    })
    .filter(Boolean)
}

export function updateProjectBoqItems(projectId, boqId, items) {
  const store = readStore()
  const boqs = normalizeProjectBoqs(store[projectId])
  const index = boqs.findIndex((boq) => boq.id === boqId)

  if (index === -1) {
    return null
  }

  const normalizedItems = normalizeBoqItems(items)
  boqs[index] = { ...boqs[index], items: normalizedItems }
  store[projectId] = { boqs }
  writeStore(store)
  rememberBoqDescriptions(
    projectId,
    normalizedItems.map((item) => item.itemName)
  )
  return boqs[index]
}

export function addProjectBoq(projectId, { name, fileName, items, demo = false }) {
  const store = readStore()
  const boqs = normalizeProjectBoqs(store[projectId])
  const trimmedName = String(name ?? "").trim()

  const newBoq = {
    id: createBoqId(),
    name: trimmedName || fileName?.replace(/\.[^.]+$/, "") || "BOQ",
    fileName: fileName ?? "",
    uploadedAt: new Date().toISOString(),
    items: normalizeBoqItems(items),
    demo: Boolean(demo),
  }

  store[projectId] = { boqs: [...boqs, newBoq] }
  writeStore(store)
  rememberBoqDescriptions(
    projectId,
    newBoq.items.map((item) => item.itemName)
  )
  return newBoq
}

/** @deprecated Use addProjectBoq — replaces all BOQs with a single entry */
export function saveProjectBoq(projectId, boq) {
  const store = readStore()
  store[projectId] = {
    boqs: [
      {
        id: boq.id ?? createBoqId(),
        name: boq.name ?? boq.fileName?.replace(/\.[^.]+$/, "") ?? "BOQ",
        fileName: boq.fileName ?? "",
        uploadedAt: boq.uploadedAt ?? new Date().toISOString(),
        items: boq.items ?? [],
      },
    ],
  }
  writeStore(store)
}

export function getAllBoqItemNames(projectId) {
  return getProjectBoqs(projectId).flatMap((boq) => boq.items.map((item) => item.itemName))
}

export function formatBoqRateAnalysisHeading(boqName) {
  return `${boqName} rate analysis`
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
}

function detectColumnIndexes(headers) {
  let itemIndex = -1
  let rateIndex = -1
  let quantityIndex = -1
  let unitIndex = -1

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header)
    if (itemIndex === -1 && ITEM_HEADER_HINTS.some((hint) => normalized.includes(hint))) {
      itemIndex = index
    }
    if (rateIndex === -1 && RATE_HEADER_HINTS.some((hint) => normalized.includes(hint))) {
      rateIndex = index
    }
    if (
      quantityIndex === -1 &&
      QUANTITY_HEADER_HINTS.some((hint) => normalized.includes(hint))
    ) {
      quantityIndex = index
    }
    if (unitIndex === -1 && UNIT_HEADER_HINTS.some((hint) => normalized.includes(hint))) {
      unitIndex = index
    }
  })

  if (itemIndex === -1) itemIndex = 0
  if (rateIndex === -1) rateIndex = headers.length > 1 ? headers.length - 1 : 1

  return { itemIndex, rateIndex, quantityIndex, unitIndex }
}

export function parseBoqRateInput(value) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function parseRateValue(value) {
  return parseBoqRateInput(value)
}

export function parseBoqRows(matrix) {
  if (!matrix?.length) return []

  const headerRowIndex = matrix.findIndex((row) =>
    row.some((cell) => ITEM_HEADER_HINTS.some((hint) => normalizeHeader(cell).includes(hint)))
  )

  const headers = matrix[headerRowIndex >= 0 ? headerRowIndex : 0] ?? []
  const { itemIndex, rateIndex, quantityIndex, unitIndex } = detectColumnIndexes(headers)
  const dataRows = matrix.slice(headerRowIndex >= 0 ? headerRowIndex + 1 : 1)

  return dataRows
    .map((row, index) => {
      const itemName = String(row[itemIndex] ?? "").trim()
      const rate = parseRateValue(row[rateIndex])
      const quantity =
        quantityIndex >= 0 ? parseRateValue(row[quantityIndex]) : null
      const unit = unitIndex >= 0 ? String(row[unitIndex] ?? "").trim() : ""

      if (!itemName || rate === null) {
        return null
      }

      return {
        id: `boq-${index}-${itemName.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
        itemName,
        rate,
        ...(quantity !== null ? { quantity } : {}),
        ...(unit ? { unit } : {}),
      }
    })
    .filter(Boolean)
}

export async function parseBoqFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase()

  if (extension === "csv" || extension === "txt") {
    const text = await file.text()
    const matrix = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell) => cell.replace(/^"|"$/g, "").trim()))

    return parseBoqRows(matrix)
  }

  try {
    const XLSX = await import("xlsx")
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

    return parseBoqRows(matrix)
  } catch {
    throw new Error(
      "Could not read Excel file. Save your BOQ as CSV, or run npm install xlsx to enable .xlsx upload."
    )
  }
}

function buildSearchText(rateRow) {
  return [rateRow.activityDescription, ...(rateRow.plantNames ?? [])]
    .filter(Boolean)
    .join(" ")
}

export function compareValuationRatesWithBoq(projectId, dayIds, rateRows, boqItems, period = "daily") {
  void projectId
  void dayIds
  const hasBoq = boqItems?.length > 0

  return rateRows.map((rateRow) => {
    const actualRate = rateRow.actualRate
    let bestMatch = null
    let bestScore = 0

    if (hasBoq) {
      const searchText = buildSearchText(rateRow)

      for (const boqItem of boqItems) {
        const forwardScore = keywordScore(searchText, boqItem.itemName)
        const reverseScore = keywordScore(boqItem.itemName, searchText)
        const activityScore = keywordScore(rateRow.activityDescription || "", boqItem.itemName)
        const score = Math.max(forwardScore, reverseScore, activityScore)

        if (score > bestScore) {
          bestScore = score
          bestMatch = boqItem
        }
      }
    }

    const matched = bestScore >= 0.2 ? bestMatch : null
    const boqRate = matched?.rate ?? null
    const actualProduction = rateRow.production ?? null
    const variance =
      actualRate !== null && boqRate !== null
        ? Math.round((actualRate - boqRate) * 10000) / 10000
        : null

    return {
      activityDescription: rateRow.activityDescription,
      actualRate,
      actualProduction,
      unit: rateRow.unit ?? "",
      boqItemName: matched?.itemName ?? "—",
      boqRate,
      boqUnit: matched?.unit ?? "",
      matchScore: Math.round(bestScore * 100),
      variance,
      period,
    }
  })
}

/** @deprecated Use compareValuationRatesWithBoq with valuation rate rows */
export function compareRatesWithBoq(projectId, dayIds, rateRows, boqItems, period = "daily") {
  void projectId
  void dayIds

  const valuationRows = rateRows.map((row) => ({
    activityDescription: row.activityOnSite || row.plantName || "—",
    actualRate: row.dailyRate ?? row.scheduleRate ?? null,
    plantNames: row.plantName ? [row.plantName] : [],
  }))

  return compareValuationRatesWithBoq(projectId, dayIds, valuationRows, boqItems, period)
}

export function formatBoqRate(value) {
  if (value === null || value === undefined) return "—"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

export function removeProjectBoq(projectId, boqId) {
  if (typeof window === "undefined") return false

  const store = readStore()
  const boqs = normalizeProjectBoqs(store[projectId]).filter((boq) => boq.id !== boqId)

  if (boqs.length === normalizeProjectBoqs(store[projectId]).length) {
    return false
  }

  if (boqs.length === 0) {
    delete store[projectId]
  } else {
    store[projectId] = { boqs }
  }

  writeStore(store)
  return true
}

export function removeBoqsForProject(projectId) {
  if (typeof window === "undefined") return

  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllBoqs() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(BOQ_STORAGE_KEY)
}
