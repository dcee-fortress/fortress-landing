import { dayIdFromDate, parseDayId, getTodayDayId } from "@/lib/dailyFiles"
import { parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

export const GOODS_RECEIVED_STORAGE_KEY = "grove-goods-received"

const goodsReceivedStore = createLocalStorageCache(GOODS_RECEIVED_STORAGE_KEY, {})

export const GOODS_RECEIVED_COLUMNS = [
  {
    key: "description",
    label: "Description of good",
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
    key: "quantity",
    label: "Quantity of good",
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
    label: "Total cost of good",
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

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
}

export function createGoodsReceivedRow() {
  return {
    id: `gr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    supplier: "",
    quantity: "",
    invoiceNumber: "",
    orderNumber: "",
    unitPrice: "",
    totalCost: null,
  }
}

export function computeGoodsReceivedTotalCost(row) {
  const quantity = normalizeAmount(row?.quantity)
  const unitPrice = normalizeAmount(row?.unitPrice)
  return roundMaterialAmount(quantity * unitPrice) ?? 0
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
      String(row.invoiceNumber || "").trim() ||
      String(row.orderNumber || "").trim() ||
      normalizeAmount(row.quantity) ||
      normalizeAmount(row.unitPrice)
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
    quantity: row.quantity ?? "",
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
    roundMaterialAmount(rows.reduce((sum, row) => sum + normalizeAmount(row.totalCost), 0)) ?? 0
  const totalQuantity =
    roundMaterialAmount(rows.reduce((sum, row) => sum + normalizeAmount(row.quantity), 0)) ?? 0

  return {
    totalCost,
    totalQuantity,
    rowCount: rows.length,
  }
}

export function getGoodsReceivedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = goodsReceivedStore.read()
  const prefix = `${projectId}::`
  return Object.keys(store)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
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
 */
export function getGoodsReceivedDashboardLinesForDayIds(projectId, dayIds) {
  const buckets = new Map()

  for (const dayId of dayIds || []) {
    for (const row of withGoodsReceivedTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)) {
      const description = String(row.description || "").trim() || "—"
      const key = description.toLowerCase()
      const quantity = normalizeAmount(row.quantity)
      const totalCost = normalizeAmount(row.totalCost)
      const existing = buckets.get(key)
      if (existing) {
        existing.quantity =
          roundMaterialAmount(existing.quantity + quantity) ?? existing.quantity
        existing.totalCost =
          roundMaterialAmount(existing.totalCost + totalCost) ?? existing.totalCost
      } else {
        buckets.set(key, {
          id: `gr-roll-${key}`,
          description,
          quantity,
          totalCost,
        })
      }
    }
  }

  return [...buckets.values()].sort((left, right) =>
    left.description.localeCompare(right.description)
  )
}

export function getGoodsReceivedTotalsForDayIds(projectId, dayIds) {
  const lines = getGoodsReceivedDashboardLinesForDayIds(projectId, dayIds)
  return {
    totalCost:
      roundMaterialAmount(lines.reduce((sum, line) => sum + line.totalCost, 0)) ?? 0,
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
      description: "Ready for goods received entry",
    }
  }

  if (hasData) {
    return {
      key: "in-progress",
      label: isToday ? "In progress" : "Saved",
      description: isToday
        ? "Goods received entered today — you can still edit"
        : "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for goods received entry",
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

  const store = { ...goodsReceivedStore.read() }
  const key = dayKey(projectId, dayId)
  delete store[key]

  const deleted = new Set(readDeletedDayIds(store, projectId))
  deleted.add(dayId)
  store[DELETED_DAYS_KEY] = {
    ...(store[DELETED_DAYS_KEY] && typeof store[DELETED_DAYS_KEY] === "object"
      ? store[DELETED_DAYS_KEY]
      : {}),
    [projectId]: [...deleted].sort(),
  }

  await goodsReceivedStore.write(store)
  return { ok: true }
}

export async function restoreGoodsReceivedDayFromTrash(entry) {
  if (!entry?.projectId || !entry?.dayId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  const store = { ...goodsReceivedStore.read() }
  const key = dayKey(entry.projectId, entry.dayId)
  const rows = Array.isArray(entry.snapshot?.rows) ? entry.snapshot.rows : []

  if (rows.some(rowHasEntry)) {
    store[key] = rows
  }

  const deleted = new Set(readDeletedDayIds(store, entry.projectId))
  deleted.delete(entry.dayId)
  store[DELETED_DAYS_KEY] = {
    ...(store[DELETED_DAYS_KEY] && typeof store[DELETED_DAYS_KEY] === "object"
      ? store[DELETED_DAYS_KEY]
      : {}),
    [entry.projectId]: [...deleted].sort(),
  }

  await goodsReceivedStore.write(store)
  return { ok: true }
}
