import { addDays, dayIdFromDate, getTodayDayId, parseDayId, startOfDay } from "@/lib/dailyFiles"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import {
  getGoodsAcquiredDashboardLinesForDayIds,
  getGoodsAcquiredDayIds,
  getGoodsAcquiredQuantityByDescription,
} from "@/lib/goodsAcquired"
import { extractFuelName } from "@/lib/fuelNames"
import { getProjectStartDate } from "@/lib/periodFiles"
import { getProjectEffectiveThroughDate } from "@/lib/projectRegistry"
import { mergeSimilarReceivedLines } from "@/lib/similarDescriptions"
import {
  parsePlantCostAmount,
  roundMaterialAmount,
  roundMaterialUnitPrice,
} from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

export const GOODS_RECEIVED_STORAGE_KEY = "grove-goods-received"

/** Daily fuel consumed files are created automatically from this date onward. */
export const FUEL_CONSUMED_AUTO_START_DAY_ID = "2026-10-26"

const goodsReceivedStore = createLocalStorageCache(GOODS_RECEIVED_STORAGE_KEY, {})

export const GOODS_RECEIVED_COLUMNS = [
  {
    key: "description",
    label: "Fuel name",
    align: "left",
    editable: true,
  },
  {
    key: "unit",
    label: "Unit",
    align: "left",
    editable: true,
  },
  {
    key: "quantity",
    label: "Quantity of fuel consumed",
    align: "right",
    editable: true,
    numeric: true,
  },
  {
    key: "unitPrice",
    label: "Unit price",
    align: "right",
    editable: true,
    numeric: true,
  },
  {
    key: "totalCost",
    label: "Total cost",
    align: "right",
    editable: false,
    numeric: true,
    computed: true,
  },
]

function dayKey(projectId, dayId) {
  return `${projectId}::${dayId}`
}

const DELETED_DAYS_KEY = "__deletedDays__"
const MANUAL_FILES_KEY = "__manualDailyFiles__"
const MANUAL_MODE_FLAG = "__goodsReceivedManualModeV1__"
const FILE_EPOCH_KEY = "__goodsReceivedFileEpoch__"

function readDeletedDayIds(store, projectId) {
  const bucket = store?.[DELETED_DAYS_KEY]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(String(id))) : []
}

export function getGoodsReceivedDeletedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  return readDeletedDayIds(goodsReceivedStore.read(), projectId)
}

export function isGoodsReceivedDayDeleted(projectId, dayId) {
  return getGoodsReceivedDeletedDayIds(projectId).includes(dayId)
}

function readManualDayIds(store, projectId) {
  const bucket = store?.[MANUAL_FILES_KEY]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(String(id))) : []
}

function writeManualDayIds(store, projectId, ids) {
  return {
    ...store,
    [MANUAL_FILES_KEY]: {
      ...(store[MANUAL_FILES_KEY] && typeof store[MANUAL_FILES_KEY] === "object"
        ? store[MANUAL_FILES_KEY]
        : {}),
      [projectId]: [...ids]
        .filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(String(id)))
        .sort((left, right) => right.localeCompare(left)),
    },
  }
}

function writeProjectBucket(store, key, projectId, value) {
  return {
    ...store,
    [key]: {
      ...(store[key] && typeof store[key] === "object" ? store[key] : {}),
      [projectId]: value,
    },
  }
}

function readProjectFlag(store, key, projectId) {
  const bucket = store?.[key]
  return Boolean(bucket && typeof bucket === "object" && bucket[projectId])
}

function buildGoodsReceivedFile(dayId) {
  return {
    id: dayId,
    dayId,
    label: formatDayLabelFromId(dayId) || dayId,
    date: dayId,
    isToday: dayId === getTodayDayId(),
  }
}

function listAutoFuelConsumedDayIds(projectId) {
  const projectStartId = dayIdFromDate(getProjectStartDate(projectId))
  const fromId =
    projectStartId > FUEL_CONSUMED_AUTO_START_DAY_ID
      ? projectStartId
      : FUEL_CONSUMED_AUTO_START_DAY_ID
  const throughRaw = String(getProjectEffectiveThroughDate(projectId) || getTodayDayId())
  const throughId = /^\d{4}-\d{2}-\d{2}$/.test(throughRaw) ? throughRaw : getTodayDayId()
  if (throughId < fromId) return []

  const ids = []
  let cursor = startOfDay(parseDayId(fromId))
  const end = startOfDay(parseDayId(throughId))
  while (cursor <= end) {
    ids.push(dayIdFromDate(cursor))
    cursor = addDays(cursor, 1)
  }
  return ids
}

/** Keep days that already have entries, then open automatic daily files from 26 Oct 2026. */
export async function migrateGoodsReceivedToManualFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return false
  const store = goodsReceivedStore.read()
  if (readProjectFlag(store, MANUAL_MODE_FLAG, projectId)) return false

  const withData = getGoodsReceivedDayIds(projectId)
  const existingManual = readManualDayIds(store, projectId)
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const keep = new Set([...withData, ...existingManual, ...listAutoFuelConsumedDayIds(projectId)])
  for (const dayId of deleted) keep.delete(dayId)

  let next = writeManualDayIds(store, projectId, keep)
  next = writeProjectBucket(next, MANUAL_MODE_FLAG, projectId, true)
  const epochs = next[FILE_EPOCH_KEY]
  const currentEpoch =
    epochs && typeof epochs === "object" ? Number(epochs[projectId]) || 0 : 0
  if (!currentEpoch) {
    next = writeProjectBucket(next, FILE_EPOCH_KEY, projectId, Date.now())
  }
  await goodsReceivedStore.write(next)
  return true
}

/** Create blank daily fuel consumed files from 26 Oct 2026 through today. */
export async function ensureGoodsReceivedAutoDailyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return false
  await migrateGoodsReceivedToManualFiles(projectId)

  let store = { ...goodsReceivedStore.read() }
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const manual = new Set(readManualDayIds(store, projectId))
  let changed = false

  for (const dayId of listAutoFuelConsumedDayIds(projectId)) {
    if (deleted.has(dayId) || manual.has(dayId)) continue
    manual.add(dayId)
    changed = true
  }

  if (!changed && readProjectFlag(store, MANUAL_MODE_FLAG, projectId)) return false

  store = writeManualDayIds(store, projectId, manual)
  store = writeProjectBucket(store, MANUAL_MODE_FLAG, projectId, true)
  await goodsReceivedStore.write(store)
  return true
}

export function getGoodsReceivedDailyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = goodsReceivedStore.read()
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const manual = readManualDayIds(store, projectId)
  const auto = listAutoFuelConsumedDayIds(projectId)
  const ids = readProjectFlag(store, MANUAL_MODE_FLAG, projectId)
    ? [...new Set([...manual, ...auto])]
    : [...new Set([...manual, ...auto, ...getGoodsReceivedDayIds(projectId)])]
  return ids
    .filter((dayId) => !deleted.has(dayId))
    .sort((left, right) => right.localeCompare(left))
    .map(buildGoodsReceivedFile)
}

export function getGoodsReceivedDailyFile(projectId, dayId) {
  if (!projectId || !dayId || isGoodsReceivedDayDeleted(projectId, dayId)) return null
  if (typeof window === "undefined") return null
  return getGoodsReceivedDailyFiles(projectId).find((file) => file.id === dayId) ?? null
}

export async function createGoodsReceivedDailyFileForToday(projectId) {
  if (typeof window === "undefined" || !projectId) {
    return { ok: false, message: "Missing project." }
  }

  await ensureGoodsReceivedAutoDailyFiles(projectId)

  const dayId = getTodayDayId()
  let store = { ...goodsReceivedStore.read() }
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const manual = new Set(readManualDayIds(store, projectId))

  if ((manual.has(dayId) || dayId >= FUEL_CONSUMED_AUTO_START_DAY_ID) && !deleted.has(dayId)) {
    if (!manual.has(dayId)) {
      manual.add(dayId)
      store = writeManualDayIds(store, projectId, manual)
      store = writeProjectBucket(store, MANUAL_MODE_FLAG, projectId, true)
      await goodsReceivedStore.write(store)
    }
    return {
      ok: true,
      dayId,
      alreadyExists: true,
      file: buildGoodsReceivedFile(dayId),
      message: "Today's fuel consumed file already exists.",
    }
  }

  deleted.delete(dayId)
  manual.add(dayId)
  store = writeManualDayIds(store, projectId, manual)
  store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())
  store = writeProjectBucket(store, MANUAL_MODE_FLAG, projectId, true)
  await goodsReceivedStore.write(store)
  return {
    ok: true,
    dayId,
    alreadyExists: false,
    file: buildGoodsReceivedFile(dayId),
  }
}

export async function renameGoodsReceivedDailyFile(projectId, fromDayId, toDayId) {
  if (
    typeof window === "undefined" ||
    !projectId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(fromDayId || "")) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(toDayId || ""))
  ) {
    return { ok: false, message: "Choose a valid date." }
  }
  if (fromDayId === toDayId) return { ok: true, dayId: toDayId }

  let store = { ...goodsReceivedStore.read() }
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const manual = new Set(readManualDayIds(store, projectId))

  const autoDays = new Set(listAutoFuelConsumedDayIds(projectId))
  if ((!manual.has(fromDayId) && !autoDays.has(fromDayId)) || deleted.has(fromDayId)) {
    return { ok: false, message: "This file is no longer in the daily list." }
  }
  if (manual.has(toDayId) && !deleted.has(toDayId)) {
    return {
      ok: false,
      message: "A fuel consumed file already exists for that date.",
    }
  }

  const fromKey = dayKey(projectId, fromDayId)
  const toKey = dayKey(projectId, toDayId)
  if (store[fromKey] !== undefined) {
    store[toKey] = store[fromKey]
  }
  delete store[fromKey]

  manual.delete(fromDayId)
  manual.add(toDayId)
  deleted.add(fromDayId)
  deleted.delete(toDayId)

  store = writeManualDayIds(store, projectId, manual)
  store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())
  await goodsReceivedStore.write(store)
  return { ok: true, dayId: toDayId, file: buildGoodsReceivedFile(toDayId) }
}

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
}

function normalizeUnitPrice(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialUnitPrice(parsed) ?? 0
}

export function createGoodsReceivedRow() {
  return {
    id: `gr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    supplier: "",
    unit: "",
    quantity: "",
    invoiceNumber: "",
    orderNumber: "",
    unitPrice: "",
    totalCost: null,
  }
}

export function computeGoodsReceivedTotalCost(row) {
  const quantity = normalizeAmount(row?.quantity)
  const unitPrice = normalizeUnitPrice(row?.unitPrice)
  return roundMaterialUnitPrice(quantity * unitPrice) ?? 0
}

export function withGoodsReceivedTotals(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    totalCost: computeGoodsReceivedTotalCost(row),
  }))
}

function rowHasEntry(row) {
  if (!row || typeof row !== "object") return false
  return Boolean(
    String(row.description || "").trim() ||
      String(row.supplier || "").trim() ||
      String(row.unit || "").trim() ||
      String(row.invoiceNumber || "").trim() ||
      String(row.orderNumber || "").trim() ||
      normalizeAmount(row.quantity) ||
      normalizeUnitPrice(row.unitPrice)
  )
}

function readRawRows(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) return []
  const raw = goodsReceivedStore.read()[dayKey(projectId, dayId)]
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && Array.isArray(raw.rows)) return raw.rows
  return []
}

export function getGoodsReceivedRows(projectId, dayId) {
  const rows = withGoodsReceivedTotals(readRawRows(projectId, dayId))
  return rows.length > 0 ? rows : withGoodsReceivedTotals([createGoodsReceivedRow()])
}

export function saveGoodsReceivedRows(projectId, dayId, rows) {
  if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
  const store = { ...goodsReceivedStore.read() }
  const key = dayKey(projectId, dayId)
  const cleaned = withGoodsReceivedTotals(rows).map((row) => ({
    id: row.id || createGoodsReceivedRow().id,
    description: String(row.description ?? ""),
    supplier: String(row.supplier ?? ""),
    unit: String(row.unit ?? ""),
    quantity: row.quantity ?? "",
    quantityFormula: String(row.quantityFormula ?? ""),
    invoiceNumber: String(row.invoiceNumber ?? ""),
    orderNumber: String(row.orderNumber ?? ""),
    unitPrice: row.unitPrice ?? "",
    totalCost: computeGoodsReceivedTotalCost(row),
  }))

  if (!cleaned.some(rowHasEntry)) {
    delete store[key]
  } else {
    store[key] = cleaned
  }

  return goodsReceivedStore.write(store)
}

export function hasGoodsReceivedDataForDay(projectId, dayId) {
  return readRawRows(projectId, dayId).some(rowHasEntry)
}

export function getGoodsReceivedDayTotals(projectId, dayId) {
  const rows = withGoodsReceivedTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)
  const totalCost =
    roundMaterialUnitPrice(rows.reduce((sum, row) => sum + normalizeUnitPrice(row.totalCost), 0)) ?? 0
  const totalQuantity =
    roundMaterialAmount(rows.reduce((sum, row) => sum + normalizeAmount(row.quantity), 0)) ?? 0

  return {
    totalCost,
    totalQuantity,
    rowCount: rows.length,
  }
}

export function getGoodsReceivedHistoryRows(projectId, excludeDayId = "") {
  return getGoodsReceivedDayIds(projectId)
    .filter((dayId) => dayId !== excludeDayId)
    .flatMap((dayId) => readRawRows(projectId, dayId))
}

export function getGoodsReceivedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = goodsReceivedStore.read()
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const prefix = `${projectId}::`
  return Object.keys(store)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
    .filter((dayId) => !deleted.has(dayId))
    .filter((dayId) => hasGoodsReceivedDataForDay(projectId, dayId))
    .sort((left, right) => left.localeCompare(right))
}

export function getGoodsReceivedDayIdsInWeek(projectId, weekId) {
  const start = parseDayId(weekId)
  const end = dayIdFromDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
  return getGoodsReceivedDayIds(projectId).filter((dayId) => dayId >= weekId && dayId <= end)
}

export function getGoodsReceivedDayIdsInMonth(projectId, monthId) {
  return getGoodsReceivedDayIds(projectId).filter((dayId) => dayId.startsWith(`${monthId}-`))
}

/**
 * Dashboard lines for one day — same description merges quantity + total cost.
 */
export function getGoodsReceivedDashboardLinesForDay(projectId, dayId) {
  return getGoodsReceivedDashboardLinesForDayIds(projectId, dayId ? [dayId] : [])
}

/**
 * Roll up lines across days. Same description (case-insensitive) merges quantity + cost.
 * Unit is kept from the first non-empty value. Current goods balance = requested qty − received qty.
 * combineSimilar writes one universal description for similar wording and adds those quantities.
 */
export function getGoodsReceivedDashboardLinesForDayIds(projectId, dayIds, options = {}) {
  const buckets = new Map()

  for (const dayId of dayIds || []) {
    for (const row of withGoodsReceivedTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)) {
      const description = extractFuelName(row.description)
      if (!description) continue
      const key = description.toLowerCase()
      const quantity = normalizeAmount(row.quantity)
      const totalCost = normalizeUnitPrice(row.totalCost)
      const unit = String(row.unit || "").trim()
      const existing = buckets.get(key)
      if (existing) {
        existing.quantity =
          roundMaterialAmount(existing.quantity + quantity) ?? existing.quantity
        existing.totalCost =
          roundMaterialUnitPrice(existing.totalCost + totalCost) ?? existing.totalCost
        if (!existing.unit && unit) existing.unit = unit
      } else {
        buckets.set(key, {
          id: `gr-roll-${key}`,
          description,
          unit,
          quantity,
          totalCost,
          currentGoodsBalance: 0,
        })
      }
    }
  }

  const sortedIds = [...new Set((dayIds || []).filter(Boolean))].sort()
  const start = sortedIds[0] || ""
  const end = sortedIds[sortedIds.length - 1] || ""
  const singleDay = sortedIds.length <= 1
  const requestedIds = getGoodsAcquiredDayIds(projectId).filter((dayId) => {
    if (!end) return false
    if (singleDay) return dayId <= end
    return dayId >= start && dayId <= end
  })
  const receivedLines = [...buckets.values()]
  if (options.combineSimilar) {
    const acquiredLines = getGoodsAcquiredDashboardLinesForDayIds(projectId, requestedIds)
    return mergeSimilarReceivedLines(receivedLines, acquiredLines)
  }

  const acquiredByDescription = getGoodsAcquiredQuantityByDescription(projectId, requestedIds)

  return receivedLines
    .map((line) => {
      const acquiredQty =
        acquiredByDescription.get(String(line.description || "").trim().toLowerCase()) || 0
      return {
        ...line,
        currentGoodsBalance:
          roundMaterialAmount(acquiredQty - (Number(line.quantity) || 0)) ?? 0,
      }
    })
    .sort((left, right) => left.description.localeCompare(right.description))
}

export function getGoodsReceivedTotalsForDayIds(projectId, dayIds) {
  const lines = getGoodsReceivedDashboardLinesForDayIds(projectId, dayIds)
  return {
    totalCost:
      roundMaterialUnitPrice(lines.reduce((sum, line) => sum + line.totalCost, 0)) ?? 0,
    totalQuantity:
      roundMaterialAmount(lines.reduce((sum, line) => sum + line.quantity, 0)) ?? 0,
    rowCount: lines.length,
    dayCount: (dayIds || []).filter((dayId) => hasGoodsReceivedDataForDay(projectId, dayId))
      .length,
  }
}

export function getGoodsReceivedProjectTotals(projectId) {
  return getGoodsReceivedTotalsForDayIds(projectId, getGoodsReceivedDayIds(projectId))
}

export function getGoodsReceivedEntryStatus(projectId, file) {
  const hasData = hasGoodsReceivedDataForDay(projectId, file.id)
  const isToday = file.id === getTodayDayId()

  if (isToday && !hasData) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for fuel consumed entry",
    }
  }

  if (hasData) {
    return {
      key: "in-progress",
      label: isToday ? "In progress" : "Saved",
      description: isToday
        ? "Fuel consumed entered today — you can still edit"
        : "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
      description: "Ready for fuel consumed entry",
  }
}

/**
 * Clears this day's goods received entry and hides the file from the goods
 * received daily list. A snapshot is kept in Settings → Recycle files for 90 days.
 */
export async function deleteGoodsReceivedDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { ok: false, message: "Missing project or day." }
  }

  const raw = goodsReceivedStore.read()[dayKey(projectId, dayId)]
  const { addTrashEntry, TRASH_ENTRY_TYPES } = await import("@/lib/fileTrash")
  const { getProjectById } = await import("@/lib/projectList")
  const { formatDayLabelFromId } = await import("@/lib/progressReportGenerator")

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.GOODS_RECEIVED_DAILY,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId,
    label: formatDayLabelFromId(dayId) || dayId,
    snapshot: {
      rows: Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [],
    },
  })

  let store = { ...goodsReceivedStore.read() }
  const key = dayKey(projectId, dayId)
  delete store[key]

  const deleted = new Set(readDeletedDayIds(store, projectId))
  deleted.add(dayId)
  const manual = new Set(readManualDayIds(store, projectId))
  manual.delete(dayId)
  store = writeManualDayIds(store, projectId, manual)
  store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())

  await goodsReceivedStore.write(store)
  return { ok: true }
}

export async function restoreGoodsReceivedDayFromTrash(entry) {
  if (!entry?.projectId || !entry?.dayId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  let store = { ...goodsReceivedStore.read() }
  const key = dayKey(entry.projectId, entry.dayId)
  const rows = Array.isArray(entry.snapshot?.rows) ? entry.snapshot.rows : []

  if (rows.some(rowHasEntry)) {
    store[key] = rows
  }

  const deleted = new Set(readDeletedDayIds(store, entry.projectId))
  deleted.delete(entry.dayId)
  const manual = new Set(readManualDayIds(store, entry.projectId))
  manual.add(entry.dayId)
  store = writeManualDayIds(store, entry.projectId, manual)
  store = writeProjectBucket(store, DELETED_DAYS_KEY, entry.projectId, [...deleted].sort())

  await goodsReceivedStore.write(store)
  return { ok: true }
}
