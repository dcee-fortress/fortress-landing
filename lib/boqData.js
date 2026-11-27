import {
  flushGroveStoreSnapshot,
  getGroveItem,
  removeGroveItem,
  setGroveItem,
} from "@/lib/groveClientStore"
import { keywordScore } from "@/lib/textMatch"
import { rememberBoqDescriptions } from "@/lib/boqDescriptionMemory"
import { mergeBoqSourceDescriptionContinuations } from "@/lib/boqDescriptionRows.mjs"
import { calculateBoqBillCost } from "@/lib/boqBillCost.mjs"
import {
  assembleNumberedBoqItems,
  isBoqItemNumberToken,
  matchBoqItemNumberAtStart,
  sanitizeBoqItemDescription,
} from "@/lib/boqNumberedRows"

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
  // Update the in-memory grove cache immediately so Remove BOQ disappears on confirm
  // before the async Postgres write finishes.
  const raw = JSON.stringify(store)
  setGroveItem(BOQ_STORAGE_KEY, raw)
  flushGroveStoreSnapshot()
  return import("@/lib/saveToPostgres")
    .then(({ writeGroveJson }) => writeGroveJson(BOQ_STORAGE_KEY, store, { replace: true }))
    .then((value) => {
      flushGroveStoreSnapshot()
      return value
    })
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
    .filter((boq) => boq && typeof boq === "object")
    .map((boq) => ({
      ...boq,
      items: normalizeBoqItems(boq.items ?? [], {
        name: boq.name,
        fileName: boq.fileName,
      }).map((item) => ({
        ...item,
        boqId: boq.id,
        boqItemId: item.id,
      })),
    }))
}

/** Every uploaded/saved BOQ across projects — for Rate build-up copy/paste library. */
export function listAllSavedBoqs() {
  if (typeof window === "undefined") return []
  const store = readStore()
  const list = []
  for (const [projectId, raw] of Object.entries(store ?? {})) {
    if (!projectId) continue
    for (const boq of normalizeProjectBoqs(raw)) {
      if (!boq || typeof boq !== "object") continue
      const items = normalizeBoqItems(boq.items ?? [], {
        name: boq.name,
        fileName: boq.fileName,
      })
      const fileName = String(boq.fileName ?? "").trim()
      const name = String(boq.name ?? "").trim()
      if (!fileName && !name && items.length === 0) continue
      list.push({
        projectId,
        boqId: boq.id,
        name: name || fileName.replace(/\.[^.]+$/, "") || "BOQ",
        fileName,
        displayName: fileName || name || "BOQ",
        itemCount: items.length,
        uploadedAt: boq.uploadedAt ?? null,
      })
    }
  }
  return list.sort((a, b) => {
    const aTime = a.uploadedAt ? Date.parse(a.uploadedAt) : 0
    const bTime = b.uploadedAt ? Date.parse(b.uploadedAt) : 0
    return bTime - aTime || String(a.displayName).localeCompare(String(b.displayName))
  })
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

/** Keep explicit allowable rates (including 0). Do not invent them from bill rate. */
export function ensureAllowableRatesOnItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const allowableRate = parseRateValue(item?.allowableRate)
    if (allowableRate === null) return item
    return { ...item, allowableRate }
  })
}

function normalizeBoqItems(items, { name = "", fileName = "" } = {}) {
  void name
  void fileName
  return ensureAllowableRatesOnItems(items)
    .map((item, index) => {
      if (!item || typeof item !== "object") return null
      const itemName = String(item.itemName ?? "").trim()
      const allowableRate = parseRateValue(item.allowableRate)
      let billRate = parseRateValue(item.billRate)
      const fallbackRate = parseRateValue(item.rate)

      // Only use generic `rate` as bill when no bill/allowable fields were stored.
      if (billRate === null && allowableRate === null) {
        billRate = fallbackRate
      }

      const rate = billRate ?? allowableRate ?? fallbackRate
      const quantity = parseRateValue(item.quantity)
      const cost = calculateBoqBillCost(billRate, quantity)

      const itemNo =
        String(item.itemNo ?? "").trim() ||
        matchBoqItemNumberAtStart(itemName)?.itemNo ||
        ""
      const isBillHeading = /^bill\s*no\.?\s*\d+/i.test(itemName)
      const userAdded = Boolean(item.userAdded)

      // Keep every numbered BOQ line (including section headers with no qty/rate).
      if (!itemName) return null
      // Bill No. headings and user-added rows stay even without qty/rate/item no.
      if (
        rate === null &&
        quantity === null &&
        !itemNo &&
        !String(item.unit ?? "").trim() &&
        !isBillHeading &&
        !userAdded
      ) {
        return null
      }

      return {
        id:
          item.id ??
          `boq-${index}-${itemName.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
        itemName,
        ...(userAdded ? { userAdded: true } : {}),
        ...(rate !== null ? { rate: Math.round(rate * 10000) / 10000 } : {}),
        ...(billRate !== null ? { billRate: Math.round(billRate * 10000) / 10000 } : {}),
        ...(allowableRate !== null
          ? { allowableRate: Math.round(allowableRate * 10000) / 10000 }
          : {}),
        ...(itemNo ? { itemNo } : {}),
        ...(item.unit ? { unit: String(item.unit).trim() } : {}),
        ...(quantity !== null ? { quantity } : {}),
        ...(cost !== null ? { cost } : {}),
      }
    })
    .filter(Boolean)
}

function parseMatrixLineAsBoqFields(cells, columnIndexes) {
  const {
    itemIndex = 0,
    billIndex = -1,
    allowableIndex = -1,
    rateIndex = -1,
    quantityIndex = -1,
    unitIndex = -1,
    itemNoIndex = -1,
  } = columnIndexes ?? {}

  const itemName = descriptionFromRow(cells, itemIndex)
  let billRate = billIndex >= 0 ? parseRateValue(cells[billIndex]) : null
  let allowableRate = allowableIndex >= 0 ? parseRateValue(cells[allowableIndex]) : null
  const genericRate = rateIndex >= 0 ? parseRateValue(cells[rateIndex]) : null
  if (allowableRate === null && billRate === null && genericRate !== null) billRate = genericRate

  const quantity =
    quantityIndex >= 0
      ? parseRateValue(
          typeof cells[quantityIndex] === "string"
            ? String(cells[quantityIndex]).replace(/[a-z²³]/gi, " ")
            : cells[quantityIndex]
        )
      : null
  const unit = unitIndex >= 0 ? String(cells[unitIndex] ?? "").replace(/\s+/g, " ").trim() : ""
  const codedItem = itemNoIndex >= 0 ? String(cells[itemNoIndex] ?? "").trim() : ""
  const itemNo =
    codedItem ||
    (isBoqItemNumberToken(cells[itemIndex]) ? String(cells[itemIndex]).trim() : "") ||
    matchBoqItemNumberAtStart(itemName)?.itemNo ||
    ""

  if (!itemName && !itemNo) return null

  return {
    itemName: itemName || itemNo,
    itemNo,
    unit,
    quantity,
    billRate,
    allowableRate,
    rate: billRate ?? allowableRate ?? genericRate,
  }
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

export function updateProjectBoqName(projectId, boqId, name) {
  const store = readStore()
  const boqs = normalizeProjectBoqs(store[projectId])
  const index = boqs.findIndex((boq) => boq.id === boqId)
  if (index === -1) return null

  const trimmedName = String(name ?? "").trim()
  boqs[index] = { ...boqs[index], name: trimmedName || boqs[index].name }
  store[projectId] = { boqs }
  writeStore(store)
  return boqs[index]
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

function findBoqHeaderRowIndex(matrix) {
  let bestIndex = -1
  let bestScore = 0

  for (let index = 0; index < (matrix ?? []).length; index += 1) {
    const headers = matrix[index].map(normalizeHeader)
    const hasDescription = headers.some((header) =>
      /\b(description|particulars?|activity|work)\b/.test(header)
    )
    if (!hasDescription) continue

    const columnCount = headers.filter((header) =>
      /\b(quantity|qty|measured|volume|unit|uom|rate|amount|bill no|item no|item number|item code|pay item)\b/.test(
        header
      )
    ).length
    if (columnCount === 0) continue

    const score = columnCount + 2
    if (score > bestScore) {
      bestIndex = index
      bestScore = score
    }
  }

  return bestIndex
}

function isAllowRateHeader(header) {
  const normalized = normalizeHeader(header)
  if (!normalized || normalized.includes("amount")) return false
  return (
    normalized.includes("allowable rate") ||
    normalized.includes("allow rate") ||
    normalized === "allowable" ||
    normalized === "allow" ||
    (/\ballow(able)?\b/.test(normalized) && normalized.includes("rate"))
  )
}

function detectColumnIndexes(headers) {
  let itemIndex = findHeaderIndex(headers, ["description", "activity"])
  if (itemIndex === -1) itemIndex = findHeaderIndex(headers, ["work", "boq", "item"])

  const excludedForRate = itemIndex === -1 ? [] : [itemIndex]
  let allowableIndex = headers.findIndex((header, index) => {
    if (excludedForRate.includes(index)) return false
    return isAllowRateHeader(header)
  })
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

  const excludedForQty = [itemIndex, rateIndex, billIndex, allowableIndex].filter((index) => index >= 0)
  let quantityIndex = findHeaderIndex(
    headers,
    ["quantity", "qty", "measured", "volume"],
    excludedForQty
  )

  const unitIndex = findHeaderIndex(
    headers,
    UNIT_HEADER_HINTS,
    [itemIndex, rateIndex, billIndex, allowableIndex, quantityIndex].filter((index) => index >= 0)
  )

  const excludedForItemNo = [itemIndex, allowableIndex, billIndex, rateIndex, quantityIndex, unitIndex].filter(
    (index) => index >= 0
  )
  let itemNoIndex = findHeaderIndex(
    headers,
    ["bill no", "bill number", "item no", "item number", "item code", "pay item"],
    excludedForItemNo
  )
  if (itemNoIndex === -1) {
    itemNoIndex = headers.findIndex((header, index) => {
      if (excludedForItemNo.includes(index)) return false
      const normalized = normalizeHeader(header)
      return normalized === "no" || normalized === "no." || normalized === "#"
    })
  }
  if (itemNoIndex === -1) {
    itemNoIndex = findHeaderIndex(headers, ["item"], excludedForItemNo)
  }

  if (itemIndex === -1) itemIndex = 0
  // Do not fall back to a random trailing column (often Amount).
  if (billIndex === -1 && rateIndex >= 0) billIndex = rateIndex

  return { itemIndex, rateIndex, billIndex, allowableIndex, quantityIndex, unitIndex, itemNoIndex }
}

function looksLikeItemCode(value) {
  return isBoqItemNumberToken(value) || /^[\d.]+$/.test(String(value ?? "").trim())
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
  if (typeof value === "number") return Number.isFinite(value) ? value : null

  const cleaned = String(value).replace(/[^0-9.-]/g, "").trim()
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function parseRateValue(value) {
  return parseBoqRateInput(value)
}

function isPlaceholderZeroBoqRow({ hasQuantityCell, unit, billRate, allowableRate }) {
  // Wrapped description lines and section headers often repeat 0 under ALLOW RATE
  // with no qty / unit / bill rate. Keep real measured items (including allow = 0).
  if (hasQuantityCell) return false
  if (unit) return false
  if (billRate !== null) return false
  if (!(allowableRate === null || allowableRate === 0)) return false
  return true
}

export function parseBoqRows(matrix, { preferAllowable = false, preserveSourceRows = false } = {}) {
  if (!matrix?.length) return []

  const scoredHeaderIndex = findBoqHeaderRowIndex(matrix)
  const fallbackHeaderIndex = matrix.findIndex((row) =>
    row.some((cell) => ITEM_HEADER_HINTS.some((hint) => normalizeHeader(cell).includes(hint)))
  )
  const headerRowIndex = scoredHeaderIndex >= 0 ? scoredHeaderIndex : fallbackHeaderIndex

  const headers = matrix[headerRowIndex >= 0 ? headerRowIndex : 0] ?? []
  const columnIndexes = detectColumnIndexes(headers)
  const {
    itemIndex,
    billIndex,
    allowableIndex,
    rateIndex,
    quantityIndex,
    unitIndex,
    itemNoIndex,
  } = columnIndexes
  const dataRows = matrix.slice(headerRowIndex >= 0 ? headerRowIndex + 1 : 1)
  const hasAllowableColumn = allowableIndex >= 0

  const numbered = preserveSourceRows
    ? []
    : assembleNumberedBoqItems(dataRows, (row) => {
    const fields = parseMatrixLineAsBoqFields(row, {
      itemIndex,
      billIndex,
      allowableIndex,
      rateIndex,
      quantityIndex,
      unitIndex,
      itemNoIndex,
    })
    if (!fields) return null

    let billRate = fields.billRate
    let allowableRate = fields.allowableRate
    if (preferAllowable && !hasAllowableColumn && allowableRate === null) {
      allowableRate = fields.rate ?? billRate
      if (billIndex === rateIndex) billRate = null
    }

    return {
      ...fields,
      billRate,
      allowableRate,
      rate: billRate ?? allowableRate ?? fields.rate,
    }
    })

  if (numbered.length > 0) {
    return numbered.filter((item) => {
      const hasQuantityCell = item.quantity != null
      if (
        isPlaceholderZeroBoqRow({
          hasQuantityCell,
          unit: item.unit,
          billRate: item.billRate ?? null,
          allowableRate: item.allowableRate ?? null,
        })
      ) {
        // Keep numbered section / description rows even when rates are blank.
        return Boolean(item.itemNo)
      }
      return true
    })
  }

  const sourceRows = dataRows
    .map((row, index) => {
      const sourceItemName = descriptionFromRow(row, itemIndex)
      let billRate = billIndex >= 0 ? parseRateValue(row[billIndex]) : null
      let allowableRate = hasAllowableColumn ? parseRateValue(row[allowableIndex]) : null
      const genericRate = rateIndex >= 0 ? parseRateValue(row[rateIndex]) : null

      if (preferAllowable && !hasAllowableColumn && allowableRate === null) {
        allowableRate = genericRate ?? billRate
        if (billIndex === rateIndex) billRate = null
      } else if (allowableRate === null && billRate === null && genericRate !== null) {
        billRate = genericRate
      }

      const rate = billRate ?? allowableRate ?? genericRate
      const rawQuantity = quantityIndex >= 0 ? row[quantityIndex] : null
      const hasQuantityCell =
        rawQuantity !== null &&
        rawQuantity !== undefined &&
        String(rawQuantity).trim() !== ""
      const quantity = parseRateValue(
        typeof rawQuantity === "string" ? rawQuantity.replace(/[a-z²³]/gi, " ") : rawQuantity
      )
      const unit = unitIndex >= 0 ? String(row[unitIndex] ?? "").replace(/\s+/g, " ").trim() : ""
      const codedItem = itemNoIndex >= 0 ? String(row[itemNoIndex] ?? "").trim() : ""
      const itemNo =
        codedItem ||
        (looksLikeItemCode(row[itemIndex]) ? String(row[itemIndex]).trim() : "") ||
        matchBoqItemNumberAtStart(sourceItemName)?.itemNo ||
        ""
      const itemName = sourceItemName

      if (!itemName) return null

      return {
        sourceIndex: index,
        itemNo,
        itemName,
        rate,
        billRate,
        allowableRate,
        quantity,
        unit,
        hasQuantityCell,
      }
    })

  const rowsToReturn = preserveSourceRows
    ? mergeBoqSourceDescriptionContinuations(sourceRows)
    : sourceRows

  return rowsToReturn
    .filter((item) => item && (item.rate !== null || item.quantity !== null || item.itemNo))
    .filter((item) => {
      if (
        !item.itemNo &&
        isPlaceholderZeroBoqRow({
          hasQuantityCell: item.hasQuantityCell,
          unit: item.unit,
          billRate: item.billRate,
          allowableRate: item.allowableRate,
        })
      ) {
        return null
      }
      return true
    })
    .map((item) => ({
      id: `boq-${item.sourceIndex}-${item.itemName.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
      itemName: item.itemName,
      ...(item.rate !== null ? { rate: item.rate } : {}),
      ...(item.billRate !== null ? { billRate: item.billRate } : {}),
      ...(item.allowableRate !== null ? { allowableRate: item.allowableRate } : {}),
      ...(item.quantity !== null ? { quantity: item.quantity } : {}),
      ...(item.unit ? { unit: item.unit } : {}),
      ...(item.itemNo ? { itemNo: item.itemNo } : {}),
    }))
}

export function normalizeBoqDescription(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^\s*\d+(?:\.\d+)*\s*[-.:)]*\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function findBoqItemForDescription(projectId, description, source = null) {
  const needle = normalizeBoqDescription(description)
  if (!needle) return null

  const boqs = getProjectBoqs(projectId)
  // Only use boqItemId here. `source.id` is often the valuations row id, not a BOQ item id.
  const sourceBoqItemId = source?.boqItemId ? String(source.boqItemId) : ""
  if (source?.boqId && sourceBoqItemId) {
    const boq = boqs.find((item) => item.id === source.boqId)
    const byIdAndName = boq?.items.find((item) => {
      const itemId = String(item.boqItemId ?? item.id ?? "")
      return itemId === sourceBoqItemId && normalizeBoqDescription(item.itemName) === needle
    })
    if (byIdAndName) return byIdAndName

    const byId = boq?.items.find(
      (item) => String(item.boqItemId ?? item.id ?? "") === sourceBoqItemId
    )
    if (byId) return byId
  }

  const items = boqs.flatMap((boq) => boq.items ?? [])
  return items.find((item) => normalizeBoqDescription(item.itemName) === needle) ?? null
}

export function searchBoqDescriptions(projectId, query, limit = 40) {
  const needle = String(query ?? "").trim().toLowerCase()

  const seen = new Set()
  const matches = []

  for (const item of getProjectBoqs(projectId).flatMap((boq) => boq.items ?? [])) {
    const name = String(item.itemName ?? "").trim()
    if (!name) continue
    const key = normalizeBoqDescription(name)
    const itemKey = `${item.boqId ?? ""}::${item.boqItemId ?? item.id ?? ""}`
    if (!key || seen.has(itemKey)) continue

    const itemNo = String(item.itemNo ?? "").trim()
    const haystack = `${itemNo} ${name}`.toLowerCase()
    // Empty query lists BOQ descriptions so Tab can fill the first one.
    if (needle && !haystack.includes(needle)) continue

    seen.add(itemKey)
    const billRate = item.billRate ?? item.rate
    const hint = [
      itemNo ? `Bill ${itemNo}` : "",
      item.allowableRate != null ? `Allowable ${formatBoqRate(item.allowableRate)}` : "",
      billRate != null ? `Bill ${formatBoqRate(billRate)}` : "",
    ]
      .filter(Boolean)
      .join(" · ")
    matches.push({
      key: itemKey,
      value: name,
      boqId: item.boqId,
      boqItemId: item.boqItemId || item.id,
      itemNo,
      itemName: name,
      unit: String(item.unit ?? "").trim(),
      ...(hint ? { hint } : {}),
    })
    if (matches.length >= limit) break
  }

  return matches
}

export async function parseBoqFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase()
  const preferAllowable = looksLikeAllowableBoqName(file?.name)
  const stampAllowable = (items) => ensureAllowableRatesOnItems(items)

  if (extension === "pdf") {
    const body = new FormData()
    body.append("file", file)
    const response = await fetch("/api/boq/parse-pdf", { method: "POST", body })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || "Could not read that PDF. Use a text BOQ, not a scanned picture, or upload the Excel file.")
    }
    return stampAllowable(Array.isArray(data.items) ? data.items : [])
  }

  if (extension === "csv" || extension === "txt") {
    const text = await file.text()
    const matrix = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell) => cell.replace(/^"|"$/g, "").trim()))

    return stampAllowable(parseBoqRows(matrix, { preferAllowable, preserveSourceRows: true }))
  }

  try {
    const XLSX = await import("xlsx")
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheets = workbook.SheetNames.map((sheetName) => ({
      sheetName,
      matrix: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
        raw: false,
      }),
    }))
    const boqSheets = sheets.filter(({ matrix }) => findBoqHeaderRowIndex(matrix) >= 0)
    const selectedSheets = boqSheets.length > 0 ? boqSheets : sheets.slice(0, 1)
    const items = selectedSheets.flatMap(({ matrix }) =>
      parseBoqRows(matrix, { preferAllowable, preserveSourceRows: true })
    )
    return stampAllowable(
      items.map((item, index) => ({
        ...item,
        id: `boq-${index}-${String(item.itemName ?? "")
          .slice(0, 24)
          .replace(/\s+/g, "-")
          .toLowerCase()}`,
      }))
    )
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

  const number = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""))
  if (!Number.isFinite(number)) return "—"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(number)
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
