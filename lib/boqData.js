import { getGroveItem, removeGroveItem } from "@/lib/groveClientStore"
import { keywordScore } from "@/lib/textMatch"
import { rememberBoqDescriptions } from "@/lib/boqDescriptionMemory"

export const BOQ_STORAGE_KEY = "grove-boq"

const ITEM_HEADER_HINTS = ["item", "description", "activity", "work", "boq"]
const UNIT_HEADER_HINTS = ["unit", "uom"]

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = getGroveItem(BOQ_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return Promise.resolve()
  return import("@/lib/saveToPostgres").then(({ writeGroveJson }) =>
    writeGroveJson(BOQ_STORAGE_KEY, store, { replace: true })
  )
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
  return normalizeProjectBoqs(store[projectId]).map((boq) => ({
    ...boq,
    items: normalizeBoqItems(boq.items ?? [], {
      name: boq.name,
      fileName: boq.fileName,
    }),
  }))
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

function looksLikeAllowableBoqName(...values) {
  return values.some((value) => /\ballowable\b/i.test(String(value ?? "")))
}

/** Copy rate/bill into allowableRate for every item on an Allowable BOQ. */
export function ensureAllowableRatesOnItems(items, { name = "", fileName = "" } = {}) {
  const preferAllowable = looksLikeAllowableBoqName(name, fileName)
  return (Array.isArray(items) ? items : []).map((item) => {
    const allowableRate = parseRateValue(item?.allowableRate)
    const billRate = parseRateValue(item?.billRate)
    const fallbackRate = parseRateValue(item?.rate)
    if (allowableRate !== null) return item
    if (!preferAllowable) return item
    const nextAllowable = billRate ?? fallbackRate
    if (nextAllowable === null) return item
    return { ...item, allowableRate: nextAllowable }
  })
}

function normalizeBoqItems(items, { name = "", fileName = "" } = {}) {
  return ensureAllowableRatesOnItems(items, { name, fileName })
    .map((item, index) => {
      const itemName = String(item.itemName ?? "").trim()
      let allowableRate = parseRateValue(item.allowableRate)
      let billRate = parseRateValue(item.billRate)
      const fallbackRate = parseRateValue(item.rate)
      const allowableBoq = looksLikeAllowableBoqName(name, fileName)

      if (allowableBoq && allowableRate === null) {
        allowableRate = billRate ?? fallbackRate
      }
      if (billRate === null && !allowableBoq) {
        billRate = fallbackRate
      }

      const rate = billRate ?? allowableRate ?? fallbackRate

      if (!itemName || rate === null) {
        return null
      }

      const itemNo = String(item.itemNo ?? "").trim()

      return {
        id:
          item.id ??
          `boq-${index}-${itemName.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
        itemName,
        rate: Math.round(rate * 10000) / 10000,
        ...(billRate !== null ? { billRate: Math.round(billRate * 10000) / 10000 } : {}),
        ...(allowableRate !== null
          ? { allowableRate: Math.round(allowableRate * 10000) / 10000 }
          : {}),
        ...(itemNo ? { itemNo } : {}),
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

  const current = boqs[index]
  const normalizedItems = normalizeBoqItems(items, {
    name: current?.name,
    fileName: current?.fileName,
  })
  boqs[index] = { ...current, items: normalizedItems }
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

  const resolvedName = trimmedName || fileName?.replace(/\.[^.]+$/, "") || "BOQ"
  const newBoq = {
    id: createBoqId(),
    name: resolvedName,
    fileName: fileName ?? "",
    uploadedAt: new Date().toISOString(),
    items: normalizeBoqItems(items, { name: resolvedName, fileName: fileName ?? "" }),
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

function findHeaderIndex(headers, hints, excluded = [], { skipAmount = false } = {}) {
  return headers.findIndex((header, index) => {
    if (excluded.includes(index)) return false
    const normalized = normalizeHeader(header)
    if (skipAmount && normalized.includes("amount")) return false
    return hints.some((hint) => normalized.includes(hint))
  })
}

function detectColumnIndexes(headers) {
  let itemIndex = findHeaderIndex(headers, ["description", "activity"])
  if (itemIndex === -1) itemIndex = findHeaderIndex(headers, ["work", "boq", "item"])

  const excludedForRate = itemIndex === -1 ? [] : [itemIndex]
  let allowableIndex = findHeaderIndex(headers, ["allowable rate"], excludedForRate, { skipAmount: true })
  if (allowableIndex === -1) {
    allowableIndex = findHeaderIndex(headers, ["allowable"], excludedForRate, { skipAmount: true })
  }
  const excludedForBill = [...excludedForRate, allowableIndex].filter((index) => index >= 0)
  let billIndex = findHeaderIndex(
    headers,
    ["bill rate", "boq rate", "contract rate", "tender rate"],
    excludedForBill,
    { skipAmount: true }
  )
  let rateIndex = findHeaderIndex(headers, ["unit rate", "rate"], excludedForBill, { skipAmount: true })
  if (rateIndex === -1) {
    rateIndex = findHeaderIndex(headers, ["price", "cost"], excludedForBill, { skipAmount: true })
  }
  if (billIndex === -1) billIndex = rateIndex

  const excludedForQty = [itemIndex, rateIndex].filter((index) => index >= 0)
  let quantityIndex = findHeaderIndex(
    headers,
    ["quantity", "qty", "measured", "volume"],
    excludedForQty
  )
  if (quantityIndex === -1) {
    quantityIndex = findHeaderIndex(headers, ["amount"], excludedForQty)
  }

  const unitIndex = findHeaderIndex(
    headers,
    UNIT_HEADER_HINTS,
    [itemIndex, rateIndex, quantityIndex].filter((index) => index >= 0)
  )

  const excludedForItemNo = [itemIndex, allowableIndex, billIndex, rateIndex].filter((index) => index >= 0)
  let itemNoIndex = findHeaderIndex(
    headers,
    ["item no", "item number", "item code", "pay item"],
    excludedForItemNo
  )
  if (itemNoIndex === -1) {
    itemNoIndex = findHeaderIndex(headers, ["item"], excludedForItemNo)
  }

  if (itemIndex === -1) itemIndex = 0
  if (rateIndex === -1) rateIndex = headers.length > 1 ? headers.length - 1 : 1
  if (billIndex === -1) billIndex = rateIndex

  return { itemIndex, rateIndex, billIndex, allowableIndex, quantityIndex, unitIndex, itemNoIndex }
}

function looksLikeItemCode(value) {
  return /^[\d.]+$/.test(String(value ?? "").trim())
}

function looksLikePlainNumber(value) {
  return /^\$?\d[\d,]*(\.\d+)?$/.test(String(value ?? "").trim())
}

function descriptionFromRow(row, itemIndex) {
  const primary = String(row[itemIndex] ?? "").trim()
  if (primary && !looksLikeItemCode(primary)) return primary

  const alternate = row.find((cell, index) => {
    if (index === itemIndex) return false
    const text = String(cell ?? "").trim()
    if (!text || looksLikeItemCode(text) || looksLikePlainNumber(text)) return false
    return text.length > primary.length
  })

  return alternate ? String(alternate).trim() : primary
}

export function parseBoqRateInput(value) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function parseRateValue(value) {
  return parseBoqRateInput(value)
}

export function parseBoqRows(matrix, { preferAllowable = false } = {}) {
  if (!matrix?.length) return []

  const headerRowIndex = matrix.findIndex((row) =>
    row.some((cell) => ITEM_HEADER_HINTS.some((hint) => normalizeHeader(cell).includes(hint)))
  )

  const headers = matrix[headerRowIndex >= 0 ? headerRowIndex : 0] ?? []
  const { itemIndex, billIndex, allowableIndex, rateIndex, quantityIndex, unitIndex, itemNoIndex } =
    detectColumnIndexes(headers)
  const dataRows = matrix.slice(headerRowIndex >= 0 ? headerRowIndex + 1 : 1)

  return dataRows
    .map((row, index) => {
      const itemName = descriptionFromRow(row, itemIndex)
      let billRate = billIndex >= 0 ? parseRateValue(row[billIndex]) : null
      let allowableRate = allowableIndex >= 0 ? parseRateValue(row[allowableIndex]) : null
      const genericRate = rateIndex >= 0 ? parseRateValue(row[rateIndex]) : null

      // Allowable BOQ files often only have a Rate column — treat it as allowable rate.
      if (preferAllowable && allowableRate === null) {
        allowableRate = genericRate ?? billRate
        if (billIndex === rateIndex) billRate = null
      } else if (allowableRate === null && billRate === null && genericRate !== null) {
        billRate = genericRate
      }

      const rate = billRate ?? allowableRate ?? genericRate
      const quantity =
        quantityIndex >= 0 ? parseRateValue(row[quantityIndex]) : null
      const unit = unitIndex >= 0 ? String(row[unitIndex] ?? "").trim() : ""
      const codedItem = itemNoIndex >= 0 ? String(row[itemNoIndex] ?? "").trim() : ""
      const itemNo =
        codedItem || (looksLikeItemCode(row[itemIndex]) ? String(row[itemIndex]).trim() : "")

      if (!itemName || rate === null) {
        return null
      }

      return {
        id: `boq-${index}-${itemName.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
        itemName,
        rate,
        ...(billRate !== null ? { billRate } : {}),
        ...(allowableRate !== null ? { allowableRate } : {}),
        ...(quantity !== null ? { quantity } : {}),
        ...(unit ? { unit } : {}),
        ...(itemNo ? { itemNo } : {}),
      }
    })
    .filter(Boolean)
}

export function normalizeBoqDescription(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^\s*\d+(?:\.\d+)*\s*[-.:)]*\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function findBoqItemForDescription(projectId, description) {
  const needle = normalizeBoqDescription(description)
  if (!needle) return null

  const items = getProjectBoqs(projectId).flatMap((boq) => boq.items ?? [])
  return items.find((item) => normalizeBoqDescription(item.itemName) === needle) ?? null
}

export function searchBoqDescriptions(projectId, query, limit = 40) {
  const needle = String(query ?? "").trim().toLowerCase()
  if (!needle) return []

  const seen = new Set()
  const matches = []

  for (const item of getProjectBoqs(projectId).flatMap((boq) => boq.items ?? [])) {
    const name = String(item.itemName ?? "").trim()
    if (!name) continue
    const key = normalizeBoqDescription(name)
    if (!key || seen.has(key)) continue

    const itemNo = String(item.itemNo ?? "").trim()
    const haystack = `${itemNo} ${name}`.toLowerCase()
    if (!haystack.includes(needle)) continue

    seen.add(key)
    const billRate = item.billRate ?? item.rate
    const hint = [
      itemNo ? `Item ${itemNo}` : "",
      item.allowableRate != null ? `Allowable ${formatBoqRate(item.allowableRate)}` : "",
      billRate != null ? `Bill ${formatBoqRate(billRate)}` : "",
    ]
      .filter(Boolean)
      .join(" · ")
    matches.push({
      value: name,
      ...(hint ? { hint } : {}),
    })
    if (matches.length >= limit) break
  }

  return matches
}

export async function parseBoqFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase()
  const preferAllowable = looksLikeAllowableBoqName(file?.name)
  const stampAllowable = (items) =>
    ensureAllowableRatesOnItems(items, { name: file?.name, fileName: file?.name })

  if (extension === "pdf") {
    try {
      const { parseBoqPdfFile } = await import("@/lib/boqPdfImport")
      return stampAllowable(await parseBoqPdfFile(file))
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      throw new Error(
        message && !/cannot find module|unpdf/i.test(message)
          ? message
          : "Could not read that PDF. Upload a text-based BOQ PDF, or use the Excel file."
      )
    }
  }

  if (extension === "csv" || extension === "txt") {
    const text = await file.text()
    const matrix = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell) => cell.replace(/^"|"$/g, "").trim()))

    return stampAllowable(parseBoqRows(matrix, { preferAllowable }))
  }

  try {
    const XLSX = await import("xlsx")
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

    return stampAllowable(parseBoqRows(matrix, { preferAllowable }))
  } catch {
    throw new Error("Could not read that file. Upload a PDF or Excel BOQ with description and rate columns.")
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

    const exactMatch = hasBoq
      ? boqItems.find(
          (item) =>
            normalizeBoqDescription(item.itemName) ===
            normalizeBoqDescription(rateRow.activityDescription)
        )
      : null
    const matched = exactMatch ?? (bestScore >= 0.2 ? bestMatch : null)
    const allowableRate = matched?.allowableRate ?? null
    const billRate = matched?.billRate ?? matched?.rate ?? null
    const boqRate = billRate
    const actualProduction = rateRow.production ?? null
    const variance =
      actualRate !== null && billRate !== null
        ? Math.round((actualRate - billRate) * 10000) / 10000
        : null

    return {
      activityDescription: rateRow.activityDescription,
      actualRate,
      actualProduction,
      unit: rateRow.unit ?? "",
      boqItemName: matched?.itemName ?? "—",
      allowableRate,
      billRate,
      boqRate,
      boqUnit: matched?.unit ?? "",
      matchScore: exactMatch ? 100 : Math.round(bestScore * 100),
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
  if (value === null || value === undefined || value === "") return "—"

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
  removeGroveItem(BOQ_STORAGE_KEY)
}
