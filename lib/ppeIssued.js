import { dayIdFromDate, parseDayId, getTodayDayId } from "@/lib/dailyFiles"
import { parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

export const PPE_ISSUED_STORAGE_KEY = "grove-ppe-issued"

const ppeIssuedStore = createLocalStorageCache(PPE_ISSUED_STORAGE_KEY, {})

export const PPE_ISSUED_COLUMNS = [
  {
    key: "date",
    label: "Date",
    align: "left",
    editable: false,
    computed: true,
  },
  {
    key: "description",
    label: "PPE issued",
    align: "left",
    editable: true,
  },
  {
    key: "supplier",
    label: "Issued to",
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

export function getPpeIssuedDeletedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  return readDeletedDayIds(ppeIssuedStore.read(), projectId)
}

export function isPpeIssuedDayDeleted(projectId, dayId) {
  return getPpeIssuedDeletedDayIds(projectId).includes(dayId)
}

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
}

export function formatPpeIssuedDateLabel(dayId) {
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

export function createPpeIssuedRow() {
  return {
    id: `ppe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    supplier: "",
    quantity: "",
    unitPrice: "",
    totalCost: null,
  }
}

export function computePpeIssuedTotalCost(row) {
  const quantity = normalizeAmount(row?.quantity)
  const unitPrice = normalizeAmount(row?.unitPrice)
  return roundMaterialAmount(quantity * unitPrice) ?? 0
}

export function withPpeIssuedTotals(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    totalCost: computePpeIssuedTotalCost(row),
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
  const raw = ppeIssuedStore.read()[dayKey(projectId, dayId)]
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && Array.isArray(raw.rows)) return raw.rows
  return []
}

export function getPpeIssuedRows(projectId, dayId) {
  const rows = withPpeIssuedTotals(readRawRows(projectId, dayId))
  return rows.length > 0 ? rows : withPpeIssuedTotals([createPpeIssuedRow()])
}

export function savePpeIssuedRows(projectId, dayId, rows) {
  if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
  const store = { ...ppeIssuedStore.read() }
  const key = dayKey(projectId, dayId)
  const cleaned = withPpeIssuedTotals(rows).map((row) => ({
    id: row.id || createPpeIssuedRow().id,
    description: String(row.description ?? ""),
    supplier: String(row.supplier ?? ""),
    quantity: row.quantity ?? "",
    unitPrice: row.unitPrice ?? "",
    totalCost: computePpeIssuedTotalCost(row),
  }))

  if (!cleaned.some(rowHasEntry)) {
    delete store[key]
  } else {
    store[key] = cleaned
  }

  return ppeIssuedStore.write(store)
}

export function hasPpeIssuedDataForDay(projectId, dayId) {
  return readRawRows(projectId, dayId).some(rowHasEntry)
}

export function getPpeIssuedDayTotals(projectId, dayId) {
  const rows = withPpeIssuedTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)
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

export function getPpeIssuedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = ppeIssuedStore.read()
  const prefix = `${projectId}::`
  return Object.keys(store)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
    .filter((dayId) => hasPpeIssuedDataForDay(projectId, dayId))
    .sort((left, right) => left.localeCompare(right))
}

export function getPpeIssuedDayIdsInWeek(projectId, weekId) {
  const start = parseDayId(weekId)
  const end = dayIdFromDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
  return getPpeIssuedDayIds(projectId).filter((dayId) => dayId >= weekId && dayId <= end)
}

export function getPpeIssuedDayIdsInMonth(projectId, monthId) {
  return getPpeIssuedDayIds(projectId).filter((dayId) => dayId.startsWith(`${monthId}-`))
}

export function getPpeIssuedDashboardLinesForDay(projectId, dayId) {
  return getPpeIssuedDashboardLinesForDayIds(projectId, dayId ? [dayId] : [])
}

/**
 * Roll up lines across days. Same PPE description (case-insensitive) merges quantity + cost.
 */
export function getPpeIssuedDashboardLinesForDayIds(projectId, dayIds) {
  const buckets = new Map()

  for (const dayId of dayIds || []) {
    for (const row of withPpeIssuedTotals(readRawRows(projectId, dayId)).filter(rowHasEntry)) {
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

export function getPpeIssuedTotalsForDayIds(projectId, dayIds) {
  const lines = getPpeIssuedDashboardLinesForDayIds(projectId, dayIds)
  return {
    totalCost:
      roundMaterialAmount(lines.reduce((sum, line) => sum + line.totalCost, 0)) ?? 0,
    totalQuantity:
      roundMaterialAmount(lines.reduce((sum, line) => sum + line.quantity, 0)) ?? 0,
    rowCount: lines.length,
    dayCount: (dayIds || []).filter((dayId) => hasPpeIssuedDataForDay(projectId, dayId))
      .length,
  }
}

export function getPpeIssuedProjectTotals(projectId) {
  return getPpeIssuedTotalsForDayIds(projectId, getPpeIssuedDayIds(projectId))
}

export function getPpeIssuedEntryStatus(projectId, file) {
  const hasData = hasPpeIssuedDataForDay(projectId, file.id)
  const isToday = file.id === getTodayDayId()

  if (isToday && !hasData) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for PPE issued entry",
    }
  }

  if (hasData) {
    return {
      key: "in-progress",
      label: isToday ? "In progress" : "Saved",
      description: isToday
        ? "PPE issued entered today — you can still edit"
        : "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for PPE issued entry",
  }
}

export async function deletePpeIssuedDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { ok: false, message: "Missing project or day." }
  }

  const raw = ppeIssuedStore.read()[dayKey(projectId, dayId)]
  const { addTrashEntry, TRASH_ENTRY_TYPES } = await import("@/lib/fileTrash")
  const { getProjectById } = await import("@/lib/projectList")
  const { formatDayLabelFromId } = await import("@/lib/progressReportGenerator")

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.PPE_ISSUED_DAILY,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId,
    label: formatDayLabelFromId(dayId) || dayId,
    snapshot: {
      rows: Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [],
    },
  })

  const store = { ...ppeIssuedStore.read() }
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

  await ppeIssuedStore.write(store)
  return { ok: true }
}

export async function restorePpeIssuedDayFromTrash(entry) {
  if (!entry?.projectId || !entry?.dayId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  const store = { ...ppeIssuedStore.read() }
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

  await ppeIssuedStore.write(store)
  return { ok: true }
}
