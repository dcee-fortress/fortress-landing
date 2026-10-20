import { dayIdFromDate, parseDayId, getTodayDayId } from "@/lib/dailyFiles"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import { getProjectStartDate } from "@/lib/periodFiles"
import {
  parsePlantCostAmount,
  roundMaterialAmount,
  roundMaterialUnitPrice,
} from "@/lib/plantCostCalculations"
import { getProjectEffectiveThroughDate } from "@/lib/projectRegistry"
import { mergeSimilarQuantityLines } from "@/lib/similarDescriptions"
import { createLocalStorageCache } from "@/lib/storageCache"
import { generateBlankWeeklyFiles, parseDayId as parseWeekDayId } from "@/lib/weeklyFiles"

export const GOODS_ACQUIRED_STORAGE_KEY = "grove-goods-acquired"

const goodsAcquiredStore = createLocalStorageCache(GOODS_ACQUIRED_STORAGE_KEY, {})

export const GOODS_ACQUIRED_COLUMNS = [
  {
    key: "description",
    label: "Description of fuel",
    align: "left",
    editable: true,
  },
  {
    key: "supplier",
    label: "Supplier",
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
    label: "Quantity of fuel requested",
    align: "right",
    editable: true,
    numeric: true,
  },
  {
    key: "invoiceNumber",
    label: "Invoice number",
    align: "left",
    editable: true,
  },
  {
    key: "orderNumber",
    label: "Order number",
    align: "left",
    editable: true,
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
const MANUAL_MODE_FLAG = "__goodsAcquiredManualModeV1__"
const CLEARED_FLAG = "__goodsAcquiredClearedV2__"
const FILE_EPOCH_KEY = "__goodsAcquiredFileEpoch__"

function readDeletedDayIds(store, projectId) {
  const bucket = store?.[DELETED_DAYS_KEY]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(String(id))) : []
}

export function getGoodsAcquiredDeletedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  return readDeletedDayIds(goodsAcquiredStore.read(), projectId)
}

export function isGoodsAcquiredDayDeleted(projectId, dayId) {
  return getGoodsAcquiredDeletedDayIds(projectId).includes(dayId)
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

function buildGoodsAcquiredFile(dayId) {
  return {
    id: dayId,
    dayId,
    label: formatDayLabelFromId(dayId) || dayId,
    date: dayId,
    isToday: dayId === getTodayDayId(),
  }
}

function readProjectFlag(store, key, projectId) {
  const bucket = store?.[key]
  return Boolean(bucket && typeof bucket === "object" && bucket[projectId])
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

function dayIdsStoredForProject(store, projectId) {
  const prefix = `${projectId}::`
  return Object.keys(store)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
}

/** Remove every existing daily file once. Later files exist only after +. */
export async function clearLegacyGoodsAcquiredDailyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return false
  const store = { ...goodsAcquiredStore.read() }
  if (readProjectFlag(store, CLEARED_FLAG, projectId)) return false

  const existingDays = dayIdsStoredForProject(store, projectId)
  for (const dayId of existingDays) {
    delete store[dayKey(projectId, dayId)]
  }

  const deleted = new Set([...readDeletedDayIds(store, projectId), ...existingDays])
  let next = writeManualDayIds(store, projectId, [])
  next = writeProjectBucket(next, DELETED_DAYS_KEY, projectId, [...deleted].sort())
  next = writeProjectBucket(next, CLEARED_FLAG, projectId, true)
  next = writeProjectBucket(next, FILE_EPOCH_KEY, projectId, Date.now())
  next = writeProjectBucket(next, MANUAL_MODE_FLAG, projectId, true)
  await goodsAcquiredStore.write(next)
  return true
}

export function getGoodsAcquiredDailyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = goodsAcquiredStore.read()
  const deleted = new Set(readDeletedDayIds(store, projectId))
  return readManualDayIds(store, projectId)
    .filter((dayId) => !deleted.has(dayId))
    .map(buildGoodsAcquiredFile)
}

export function getGoodsAcquiredDailyFile(projectId, dayId) {
  if (!projectId || !dayId || isGoodsAcquiredDayDeleted(projectId, dayId)) return null
  if (typeof window === "undefined") return null
  return getGoodsAcquiredDailyFiles(projectId).find((file) => file.id === dayId) ?? null
}

export async function createGoodsAcquiredDailyFileForToday(projectId) {
  if (typeof window === "undefined" || !projectId) {
    return { ok: false, message: "Missing project." }
  }

  await clearLegacyGoodsAcquiredDailyFiles(projectId)

  const dayId = getTodayDayId()
  let store = { ...goodsAcquiredStore.read() }
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const manual = new Set(readManualDayIds(store, projectId))

  if (manual.has(dayId) && !deleted.has(dayId)) {
    return {
      ok: true,
      dayId,
      alreadyExists: true,
      file: buildGoodsAcquiredFile(dayId),
      message: "Today's fuel requested file already exists.",
    }
  }

  deleted.delete(dayId)
  manual.add(dayId)
  store = writeManualDayIds(store, projectId, manual)
  store[DELETED_DAYS_KEY] = {
    ...(store[DELETED_DAYS_KEY] && typeof store[DELETED_DAYS_KEY] === "object"
      ? store[DELETED_DAYS_KEY]
      : {}),
    [projectId]: [...deleted].sort(),
  }
  store[MANUAL_MODE_FLAG] = {
    ...(store[MANUAL_MODE_FLAG] && typeof store[MANUAL_MODE_FLAG] === "object"
      ? store[MANUAL_MODE_FLAG]
      : {}),
    [projectId]: true,
  }

  await goodsAcquiredStore.write(store)
  return {
    ok: true,
    dayId,
    alreadyExists: false,
    file: buildGoodsAcquiredFile(dayId),
  }
}

export async function renameGoodsAcquiredDailyFile(projectId, fromDayId, toDayId) {
  if (
    typeof window === "undefined" ||
    !projectId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(fromDayId || "")) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(toDayId || ""))
  ) {
    return { ok: false, message: "Choose a valid date." }
  }
  if (fromDayId === toDayId) return { ok: true, dayId: toDayId }

  let store = { ...goodsAcquiredStore.read() }
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const manual = new Set(readManualDayIds(store, projectId))

  if (!manual.has(fromDayId) || deleted.has(fromDayId)) {
    return { ok: false, message: "This file is no longer in the daily list." }
  }
  if (manual.has(toDayId) && !deleted.has(toDayId)) {
    return {
      ok: false,
      message: "A fuel requested file already exists for that date.",
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
  await goodsAcquiredStore.write(store)
  return { ok: true, dayId: toDayId, file: buildGoodsAcquiredFile(toDayId) }
}

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
}

function normalizeUnitPrice(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialUnitPrice(parsed) ?? 0
}

export function createGoodsAcquiredRow() {
  return {
    id: `ga-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
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

export function computeGoodsAcquiredTotalCost(row) {
  const quantity = normalizeAmount(row?.quantity)
  const unitPrice = normalizeUnitPrice(row?.unitPrice)
  return roundMaterialUnitPrice(quantity * unitPrice) ?? 0
}

export function withGoodsAcquiredTotals(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    totalCost: computeGoodsAcquiredTotalCost(row),
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
  const raw = goodsAcquiredStore.read()[dayKey(projectId, dayId)]
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && Array.isArray(raw.rows)) return raw.rows
  return []
}

export function getGoodsAcquiredRows(projectId, dayId) {
  const rows = withGoodsAcquiredTotals(readRawRows(projectId, dayId))
  return rows.length > 0 ? rows : withGoodsAcquiredTotals([createGoodsAcquiredRow()])
}

export function saveGoodsAcquiredRows(projectId, dayId, rows) {
  if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
  const store = { ...goodsAcquiredStore.read() }
  const key = dayKey(projectId, dayId)
  const cleaned = withGoodsAcquiredTotals(rows).map((row) => ({
    id: row.id || createGoodsAcquiredRow().id,
    description: String(row.description ?? ""),
    supplier: String(row.supplier ?? ""),
    unit: String(row.unit ?? ""),
    quantity: row.quantity ?? "",
    quantityFormula: String(row.quantityFormula ?? ""),
    invoiceNumber: String(row.invoiceNumber ?? ""),
    orderNumber: String(row.orderNumber ?? ""),
    unitPrice: row.unitPrice ?? "",
    totalCost: computeGoodsAcquiredTotalCost(row),
  }))

  if (!cleaned.some(rowHasEntry)) {
    delete store[key]
  } else {
    store[key] = cleaned
  }

  return goodsAcquiredStore.write(store)
}

export function hasGoodsAcquiredDataForDay(projectId, dayId) {
  return readRawRows(projectId, dayId).some(rowHasEntry)
}

export function getGoodsAcquiredDayTotals(projectId, dayId) {
  const rows = withGoodsAcquiredTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)
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

export function getGoodsAcquiredHistoryRows(projectId, excludeDayId = "") {
  return getGoodsAcquiredDayIds(projectId)
    .filter((dayId) => dayId !== excludeDayId)
    .flatMap((dayId) => readRawRows(projectId, dayId))
}

export function getGoodsAcquiredDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = goodsAcquiredStore.read()
  const deleted = new Set(readDeletedDayIds(store, projectId))
  const manual = new Set(readManualDayIds(store, projectId))
  const cleared = readProjectFlag(store, CLEARED_FLAG, projectId)
  const prefix = `${projectId}::`
  return Object.keys(store)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
    .filter((dayId) => !deleted.has(dayId))
    .filter((dayId) => !cleared || manual.has(dayId))
    .filter((dayId) => hasGoodsAcquiredDataForDay(projectId, dayId))
    .sort((left, right) => left.localeCompare(right))
}

export function getGoodsAcquiredDayIdsInWeek(projectId, weekId) {
  const start = parseDayId(weekId)
  const end = dayIdFromDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
  return getGoodsAcquiredDayIds(projectId).filter((dayId) => dayId >= weekId && dayId <= end)
}

/** One weekly file from the project start through the current week. */
export function getGoodsAcquiredWeeklyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const start = getProjectStartDate(projectId)
  const throughId = String(getProjectEffectiveThroughDate(projectId) || "")
  const through = /^\d{4}-\d{2}-\d{2}$/.test(throughId) ? parseWeekDayId(throughId) : new Date()
  return generateBlankWeeklyFiles(start, through)
}

export function getGoodsAcquiredWeeklyFile(projectId, weekId) {
  return getGoodsAcquiredWeeklyFiles(projectId).find((file) => file.id === weekId) ?? null
}

export function getGoodsAcquiredDayIdsInMonth(projectId, monthId) {
  return getGoodsAcquiredDayIds(projectId).filter((dayId) => dayId.startsWith(`${monthId}-`))
}

export function getGoodsAcquiredDashboardLinesForDay(projectId, dayId) {
  return getGoodsAcquiredDashboardLinesForDayIds(projectId, dayId ? [dayId] : [])
}

export function getGoodsAcquiredDashboardLinesForDayIds(projectId, dayIds, options = {}) {
  const buckets = new Map()

  for (const dayId of dayIds || []) {
    for (const row of withGoodsAcquiredTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)) {
      const description = String(row.description || "").trim() || "—"
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
          id: `ga-roll-${key}`,
          description,
          unit,
          quantity,
          totalCost,
        })
      }
    }
  }

  const lines = [...buckets.values()].sort((left, right) =>
    left.description.localeCompare(right.description)
  )
  return options.combineSimilar ? mergeSimilarQuantityLines(lines) : lines
}

/** Map of description (lowercase) → requested quantity across day ids. */
export function getGoodsAcquiredQuantityByDescription(projectId, dayIds) {
  const map = new Map()
  for (const line of getGoodsAcquiredDashboardLinesForDayIds(projectId, dayIds)) {
    map.set(String(line.description || "").trim().toLowerCase(), Number(line.quantity) || 0)
  }
  return map
}

export function getGoodsAcquiredTotalsForDayIds(projectId, dayIds) {
  const lines = getGoodsAcquiredDashboardLinesForDayIds(projectId, dayIds)
  return {
    totalCost:
      roundMaterialUnitPrice(lines.reduce((sum, line) => sum + line.totalCost, 0)) ?? 0,
    totalQuantity:
      roundMaterialAmount(lines.reduce((sum, line) => sum + line.quantity, 0)) ?? 0,
    rowCount: lines.length,
    dayCount: (dayIds || []).filter((dayId) => hasGoodsAcquiredDataForDay(projectId, dayId))
      .length,
  }
}

export function getGoodsAcquiredProjectTotals(projectId) {
  return getGoodsAcquiredTotalsForDayIds(projectId, getGoodsAcquiredDayIds(projectId))
}

export function getGoodsAcquiredEntryStatus(projectId, file) {
  const hasData = hasGoodsAcquiredDataForDay(projectId, file.id)
  const isToday = file.id === getTodayDayId()

  if (isToday && !hasData) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for fuel requested entry",
    }
  }

  if (hasData) {
    return {
      key: "in-progress",
      label: isToday ? "In progress" : "Saved",
      description: isToday
        ? "Fuel requested entered today — you can still edit"
        : "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for fuel requested entry",
  }
}

export async function deleteGoodsAcquiredDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { ok: false, message: "Missing project or day." }
  }

  const raw = goodsAcquiredStore.read()[dayKey(projectId, dayId)]
  const { addTrashEntry, TRASH_ENTRY_TYPES } = await import("@/lib/fileTrash")
  const { getProjectById } = await import("@/lib/projectList")
  const { formatDayLabelFromId } = await import("@/lib/progressReportGenerator")

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.GOODS_ACQUIRED_DAILY,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId,
    label: formatDayLabelFromId(dayId) || dayId,
    snapshot: {
      rows: Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [],
    },
  })

  let store = { ...goodsAcquiredStore.read() }
  const key = dayKey(projectId, dayId)
  delete store[key]

  const deleted = new Set(readDeletedDayIds(store, projectId))
  deleted.add(dayId)
  const manual = new Set(readManualDayIds(store, projectId))
  manual.delete(dayId)
  store = writeManualDayIds(store, projectId, manual)
  store[DELETED_DAYS_KEY] = {
    ...(store[DELETED_DAYS_KEY] && typeof store[DELETED_DAYS_KEY] === "object"
      ? store[DELETED_DAYS_KEY]
      : {}),
    [projectId]: [...deleted].sort(),
  }

  await goodsAcquiredStore.write(store)
  return { ok: true }
}

export async function restoreGoodsAcquiredDayFromTrash(entry) {
  if (!entry?.projectId || !entry?.dayId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  let store = { ...goodsAcquiredStore.read() }
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
  store[DELETED_DAYS_KEY] = {
    ...(store[DELETED_DAYS_KEY] && typeof store[DELETED_DAYS_KEY] === "object"
      ? store[DELETED_DAYS_KEY]
      : {}),
    [entry.projectId]: [...deleted].sort(),
  }

  await goodsAcquiredStore.write(store)
  return { ok: true }
}
