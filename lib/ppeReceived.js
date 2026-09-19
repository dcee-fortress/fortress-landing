import { dayIdFromDate, parseDayId, getTodayDayId } from "@/lib/dailyFiles"
import { parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

export const PPE_RECEIVED_STORAGE_KEY = "grove-ppe-received"

const ppeReceivedStore = createLocalStorageCache(PPE_RECEIVED_STORAGE_KEY, {})

export const PPE_RECEIVED_COLUMNS = [
  {
    key: "date",
    label: "Date",
    align: "left",
    editable: false,
    computed: true,
  },
  {
    key: "description",
    label: "PPE received",
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
    label: "Quantities",
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

function readDeletedDayIds(store, projectId) {
  const bucket = store?.[DELETED_DAYS_KEY]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(String(id))) : []
}

export function getPpeReceivedDeletedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  return readDeletedDayIds(ppeReceivedStore.read(), projectId)
}

export function isPpeReceivedDayDeleted(projectId, dayId) {
  return getPpeReceivedDeletedDayIds(projectId).includes(dayId)
}

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
}

export function formatPpeReceivedDateLabel(dayId) {
  if (!dayId || !/^\d{4}-\d{2}-\d{2}$/.test(dayId)) return dayId || ""
  try {
    const date = parseDayId(dayId)
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dayId
  }
}

export function createPpeReceivedRow() {
  return {
    id: `ppe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    supplier: "",
    quantity: "",
    unitPrice: "",
    totalCost: null,
  }
}

export function computePpeReceivedTotalCost(row) {
  const quantity = normalizeAmount(row?.quantity)
  const unitPrice = normalizeAmount(row?.unitPrice)
  return roundMaterialAmount(quantity * unitPrice) ?? 0
}

export function withPpeReceivedTotals(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    totalCost: computePpeReceivedTotalCost(row),
  }))
}

function rowHasEntry(row) {
  if (!row || typeof row !== "object") return false
  return Boolean(
    String(row.description || "").trim() ||
      String(row.supplier || "").trim() ||
      normalizeAmount(row.quantity) ||
      normalizeAmount(row.unitPrice)
  )
}

function readRawRows(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) return []
  const raw = ppeReceivedStore.read()[dayKey(projectId, dayId)]
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && Array.isArray(raw.rows)) return raw.rows
  return []
}

export function getPpeReceivedRows(projectId, dayId) {
  const rows = withPpeReceivedTotals(readRawRows(projectId, dayId))
  return rows.length > 0 ? rows : withPpeReceivedTotals([createPpeReceivedRow()])
}

export function savePpeReceivedRows(projectId, dayId, rows) {
  if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
  const store = { ...ppeReceivedStore.read() }
  const key = dayKey(projectId, dayId)
  const cleaned = withPpeReceivedTotals(rows).map((row) => ({
    id: row.id || createPpeReceivedRow().id,
    description: String(row.description ?? ""),
    supplier: String(row.supplier ?? ""),
    quantity: row.quantity ?? "",
    unitPrice: row.unitPrice ?? "",
    totalCost: computePpeReceivedTotalCost(row),
  }))

  if (!cleaned.some(rowHasEntry)) {
    delete store[key]
  } else {
    store[key] = cleaned
  }

  return ppeReceivedStore.write(store)
}

export function hasPpeReceivedDataForDay(projectId, dayId) {
  return readRawRows(projectId, dayId).some(rowHasEntry)
}

export function getPpeReceivedDayTotals(projectId, dayId) {
  const rows = withPpeReceivedTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)
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

export function getPpeReceivedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = ppeReceivedStore.read()
  const prefix = `${projectId}::`
  return Object.keys(store)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
    .filter((dayId) => hasPpeReceivedDataForDay(projectId, dayId))
    .sort((left, right) => left.localeCompare(right))
}

export function getPpeReceivedDayIdsInWeek(projectId, weekId) {
  const start = parseDayId(weekId)
  const end = dayIdFromDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
  return getPpeReceivedDayIds(projectId).filter((dayId) => dayId >= weekId && dayId <= end)
}

export function getPpeReceivedDayIdsInMonth(projectId, monthId) {
  return getPpeReceivedDayIds(projectId).filter((dayId) => dayId.startsWith(`${monthId}-`))
}

export function getPpeReceivedDashboardLinesForDay(projectId, dayId) {
  return getPpeReceivedDashboardLinesForDayIds(projectId, dayId ? [dayId] : [])
}

/**
 * Roll up lines across days. Same PPE description (case-insensitive) merges quantity + cost.
 */
export function getPpeReceivedDashboardLinesForDayIds(projectId, dayIds) {
  const buckets = new Map()

  for (const dayId of dayIds || []) {
    for (const row of withPpeReceivedTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)) {
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
          id: `ppe-roll-${key}`,
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

export function getPpeReceivedTotalsForDayIds(projectId, dayIds) {
  const lines = getPpeReceivedDashboardLinesForDayIds(projectId, dayIds)
  return {
    totalCost:
      roundMaterialAmount(lines.reduce((sum, line) => sum + line.totalCost, 0)) ?? 0,
    totalQuantity:
      roundMaterialAmount(lines.reduce((sum, line) => sum + line.quantity, 0)) ?? 0,
    rowCount: lines.length,
    dayCount: (dayIds || []).filter((dayId) => hasPpeReceivedDataForDay(projectId, dayId))
      .length,
  }
}

export function getPpeReceivedProjectTotals(projectId) {
  return getPpeReceivedTotalsForDayIds(projectId, getPpeReceivedDayIds(projectId))
}

export function getPpeReceivedEntryStatus(projectId, file) {
  const hasData = hasPpeReceivedDataForDay(projectId, file.id)
  const isToday = file.id === getTodayDayId()

  if (isToday && !hasData) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for PPE received entry",
    }
  }

  if (hasData) {
    return {
      key: "in-progress",
      label: isToday ? "In progress" : "Saved",
      description: isToday
        ? "PPE received entered today — you can still edit"
        : "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for PPE received entry",
  }
}

export async function deletePpeReceivedDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { ok: false, message: "Missing project or day." }
  }

  const raw = ppeReceivedStore.read()[dayKey(projectId, dayId)]
  const { addTrashEntry, TRASH_ENTRY_TYPES } = await import("@/lib/fileTrash")
  const { getProjectById } = await import("@/lib/projectList")
  const { formatDayLabelFromId } = await import("@/lib/progressReportGenerator")

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.PPE_RECEIVED_DAILY,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId,
    label: formatDayLabelFromId(dayId) || dayId,
    snapshot: {
      rows: Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [],
    },
  })

  const store = { ...ppeReceivedStore.read() }
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

  await ppeReceivedStore.write(store)
  return { ok: true }
}

export async function restorePpeReceivedDayFromTrash(entry) {
  if (!entry?.projectId || !entry?.dayId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  const store = { ...ppeReceivedStore.read() }
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

  await ppeReceivedStore.write(store)
  return { ok: true }
}
