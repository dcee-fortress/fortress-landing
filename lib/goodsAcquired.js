import { dayIdFromDate, parseDayId, getTodayDayId } from "@/lib/dailyFiles"
import { parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

export const GOODS_ACQUIRED_STORAGE_KEY = "grove-goods-acquired"

const goodsAcquiredStore = createLocalStorageCache(GOODS_ACQUIRED_STORAGE_KEY, {})

export const GOODS_ACQUIRED_COLUMNS = [
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
    key: "unit",
    label: "Unit",
    align: "left",
    editable: true,
  },
  {
    key: "quantity",
    label: "Quantity of good acquired",
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

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
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
  const unitPrice = normalizeAmount(row?.unitPrice)
  return roundMaterialAmount(quantity * unitPrice) ?? 0
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
      normalizeAmount(row.unitPrice)
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
    roundMaterialAmount(rows.reduce((sum, row) => sum + normalizeAmount(row.totalCost), 0)) ?? 0
  const totalQuantity =
    roundMaterialAmount(rows.reduce((sum, row) => sum + normalizeAmount(row.quantity), 0)) ?? 0

  return {
    totalCost,
    totalQuantity,
    rowCount: rows.length,
  }
}

export function getGoodsAcquiredDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = goodsAcquiredStore.read()
  const prefix = `${projectId}::`
  return Object.keys(store)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
    .filter((dayId) => hasGoodsAcquiredDataForDay(projectId, dayId))
    .sort((left, right) => left.localeCompare(right))
}

export function getGoodsAcquiredDayIdsInWeek(projectId, weekId) {
  const start = parseDayId(weekId)
  const end = dayIdFromDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
  return getGoodsAcquiredDayIds(projectId).filter((dayId) => dayId >= weekId && dayId <= end)
}

export function getGoodsAcquiredDayIdsInMonth(projectId, monthId) {
  return getGoodsAcquiredDayIds(projectId).filter((dayId) => dayId.startsWith(`${monthId}-`))
}

export function getGoodsAcquiredDashboardLinesForDay(projectId, dayId) {
  return getGoodsAcquiredDashboardLinesForDayIds(projectId, dayId ? [dayId] : [])
}

export function getGoodsAcquiredDashboardLinesForDayIds(projectId, dayIds) {
  const buckets = new Map()

  for (const dayId of dayIds || []) {
    for (const row of withGoodsAcquiredTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)) {
      const description = String(row.description || "").trim() || "—"
      const key = description.toLowerCase()
      const quantity = normalizeAmount(row.quantity)
      const totalCost = normalizeAmount(row.totalCost)
      const unit = String(row.unit || "").trim()
      const existing = buckets.get(key)
      if (existing) {
        existing.quantity =
          roundMaterialAmount(existing.quantity + quantity) ?? existing.quantity
        existing.totalCost =
          roundMaterialAmount(existing.totalCost + totalCost) ?? existing.totalCost
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

  return [...buckets.values()].sort((left, right) =>
    left.description.localeCompare(right.description)
  )
}

/** Map of description (lowercase) → acquired quantity across day ids. */
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
      roundMaterialAmount(lines.reduce((sum, line) => sum + line.totalCost, 0)) ?? 0,
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
      description: "Ready for goods acquired entry",
    }
  }

  if (hasData) {
    return {
      key: "in-progress",
      label: isToday ? "In progress" : "Saved",
      description: isToday
        ? "Goods acquired entered today — you can still edit"
        : "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for goods acquired entry",
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

  const store = { ...goodsAcquiredStore.read() }
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

  await goodsAcquiredStore.write(store)
  return { ok: true }
}

export async function restoreGoodsAcquiredDayFromTrash(entry) {
  if (!entry?.projectId || !entry?.dayId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  const store = { ...goodsAcquiredStore.read() }
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

  await goodsAcquiredStore.write(store)
  return { ok: true }
}
