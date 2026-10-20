import { getTodayDayId } from "@/lib/dailyFiles"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import {
  parsePlantCostAmount,
  roundMaterialAmount,
  roundMaterialUnitPrice,
} from "@/lib/plantCostCalculations"
import { groupBySimilarDescription } from "@/lib/similarDescriptions"
import { createLocalStorageCache } from "@/lib/storageCache"

const MANUAL_FILES_KEY = "__manualDailyFiles__"
const DELETED_DAYS_KEY = "__deletedDays__"
const EPOCH_KEY = "__goodsAcquiredFileEpoch__"
const CLEARED_KEY = "__goodsAcquiredClearedV2__"
const MODE_KEY = "__goodsAcquiredManualModeV1__"
const DAY_ID = /^\d{4}-\d{2}-\d{2}$/

function dayKey(projectId, dayId) {
  return `${projectId}::${dayId}`
}

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
}

function normalizeUnitPrice(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialUnitPrice(parsed) ?? 0
}

function readIdList(store, key, projectId) {
  const bucket = store?.[key]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.filter((id) => DAY_ID.test(String(id))) : []
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

function writeManualDayIds(store, projectId, ids) {
  return writeProjectBucket(
    store,
    MANUAL_FILES_KEY,
    projectId,
    [...ids].filter((id) => DAY_ID.test(String(id))).sort((left, right) => right.localeCompare(left))
  )
}

function bumpEpoch(store, projectId) {
  return writeProjectBucket(store, EPOCH_KEY, projectId, Date.now())
}

function markManualMode(store, projectId) {
  let next = writeProjectBucket(store, CLEARED_KEY, projectId, true)
  next = writeProjectBucket(next, MODE_KEY, projectId, true)
  return next
}

function newRowId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function latestDate(dates) {
  return [...dates].filter((date) => DAY_ID.test(String(date || ""))).sort().at(-1) || ""
}

export const BULK_MATERIAL_REQUEST_STORAGE_KEY = "grove-bulk-material-request"
export const MATERIAL_RECEIPT_STORAGE_KEY = "grove-material-receipts"

function createRegister(config) {
  const cache = createLocalStorageCache(config.storageKey, {})

  function buildFile(dayId) {
    return {
      id: dayId,
      dayId,
      label: formatDayLabelFromId(dayId) || dayId,
      date: dayId,
      isToday: dayId === getTodayDayId(),
    }
  }

  function readRawRows(projectId, dayId) {
    if (typeof window === "undefined" || !projectId || !dayId) return []
    const raw = cache.read()[dayKey(projectId, dayId)]
    return Array.isArray(raw) ? raw : []
  }

  function getDailyFiles(projectId) {
    if (typeof window === "undefined" || !projectId) return []
    const store = cache.read()
    const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
    return readIdList(store, MANUAL_FILES_KEY, projectId)
      .filter((dayId) => !deleted.has(dayId))
      .map(buildFile)
  }

  function getDailyFile(projectId, dayId) {
    if (!projectId || !dayId) return null
    return getDailyFiles(projectId).find((file) => file.id === dayId) ?? null
  }

  async function createDailyFileForToday(projectId) {
    if (typeof window === "undefined" || !projectId) {
      return { ok: false, message: "Missing project." }
    }

    const dayId = getTodayDayId()
    let store = { ...cache.read() }
    const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
    const manual = new Set(readIdList(store, MANUAL_FILES_KEY, projectId))

    if (manual.has(dayId) && !deleted.has(dayId)) {
      return {
        ok: true,
        dayId,
        alreadyExists: true,
        file: buildFile(dayId),
        message: `Today's ${config.noun} file already exists.`,
      }
    }

    deleted.delete(dayId)
    manual.add(dayId)
    store = writeManualDayIds(store, projectId, manual)
    store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())
    store = markManualMode(store, projectId)
    store = bumpEpoch(store, projectId)
    await cache.write(store)
    return { ok: true, dayId, alreadyExists: false, file: buildFile(dayId) }
  }

  async function renameDailyFile(projectId, fromDayId, toDayId) {
    if (
      typeof window === "undefined" ||
      !projectId ||
      !DAY_ID.test(String(fromDayId || "")) ||
      !DAY_ID.test(String(toDayId || ""))
    ) {
      return { ok: false, message: "Choose a valid date." }
    }
    if (fromDayId === toDayId) return { ok: true, dayId: toDayId }

    let store = { ...cache.read() }
    const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
    const manual = new Set(readIdList(store, MANUAL_FILES_KEY, projectId))

    if (!manual.has(fromDayId) || deleted.has(fromDayId)) {
      return { ok: false, message: "This file is no longer in the daily list." }
    }
    if (manual.has(toDayId) && !deleted.has(toDayId)) {
      return { ok: false, message: `A ${config.noun} file already exists for that date.` }
    }

    const fromKey = dayKey(projectId, fromDayId)
    const toKey = dayKey(projectId, toDayId)
    if (store[fromKey] !== undefined) {
      const rows = Array.isArray(store[fromKey]) ? store[fromKey] : []
      store[toKey] = rows.map((row) =>
        !row?.date || row.date === fromDayId ? { ...row, date: toDayId } : row
      )
    }
    delete store[fromKey]

    manual.delete(fromDayId)
    manual.add(toDayId)
    deleted.add(fromDayId)
    deleted.delete(toDayId)
    store = writeManualDayIds(store, projectId, manual)
    store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())
    store = markManualMode(store, projectId)
    store = bumpEpoch(store, projectId)
    await cache.write(store)
    return { ok: true, dayId: toDayId, file: buildFile(toDayId) }
  }

  async function deleteDailyFile(projectId, dayId) {
    if (typeof window === "undefined" || !projectId || !dayId) {
      return { ok: false, message: "Missing project or day." }
    }
    let store = { ...cache.read() }
    const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
    const manual = new Set(readIdList(store, MANUAL_FILES_KEY, projectId))
    delete store[dayKey(projectId, dayId)]
    manual.delete(dayId)
    deleted.add(dayId)
    store = writeManualDayIds(store, projectId, manual)
    store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())
    store = markManualMode(store, projectId)
    store = bumpEpoch(store, projectId)
    await cache.write(store)
    return { ok: true }
  }

  function prepareRows(rows, dayId) {
    return (Array.isArray(rows) ? rows : []).map((row) => config.prepareRow(row, dayId))
  }

  function getRows(projectId, dayId) {
    const rows = prepareRows(readRawRows(projectId, dayId), dayId)
    return rows.length > 0 ? rows : [config.createRow(dayId)]
  }

  function saveRows(projectId, dayId, rows) {
    if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
    let store = { ...cache.read() }
    const cleaned = prepareRows(rows, dayId)
    const key = dayKey(projectId, dayId)
    if (!cleaned.some(config.rowHasEntry)) {
      delete store[key]
    } else {
      store[key] = cleaned
    }
    store = markManualMode(store, projectId)
    store = bumpEpoch(store, projectId)
    return cache.write(store)
  }

  function savedRows(projectId, dayId) {
    return prepareRows(readRawRows(projectId, dayId), dayId).filter(config.rowHasEntry)
  }

  function hasDataForDay(projectId, dayId) {
    return savedRows(projectId, dayId).length > 0
  }

  function getDayIds(projectId) {
    return getDailyFiles(projectId)
      .map((file) => file.id)
      .filter((dayId) => hasDataForDay(projectId, dayId))
      .sort((left, right) => left.localeCompare(right))
  }

  function getDashboardLinesForDayIds(projectId, dayIds) {
    const source = []
    for (const dayId of dayIds || []) {
      for (const row of savedRows(projectId, dayId)) {
        source.push(config.toLine(row, dayId))
      }
    }
    return config.combineLines(source)
  }

  function getEntryStatus(projectId, file) {
    const hasData = hasDataForDay(projectId, file.id)
    const isToday = file.id === getTodayDayId()
    if (hasData) {
      return {
        key: "in-progress",
        label: isToday ? "In progress" : "Saved",
        description: isToday
          ? `${config.entryTitle} entered today — you can still edit`
          : "Saved — you can still edit this file at any time",
      }
    }
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: `Ready for ${config.entryTitle.toLowerCase()}`,
    }
  }

  function getHistoryRows(projectId, exceptDayId) {
    if (typeof window === "undefined" || !projectId) return []
    return getDailyFiles(projectId)
      .filter((file) => file.id !== exceptDayId)
      .flatMap((file) => savedRows(projectId, file.id))
  }

  return {
    ...config,
    getDailyFiles,
    getDailyFile,
    createDailyFileForToday,
    renameDailyFile,
    deleteDailyFile,
    getRows,
    saveRows,
    hasDataForDay,
    getDayIds,
    getDashboardLinesForDay(projectId, dayId) {
      return getDashboardLinesForDayIds(projectId, dayId ? [dayId] : [])
    },
    getDashboardLinesForDayIds,
    getEntryStatus,
    getHistoryRows,
    invalidate: () => cache.invalidate(),
  }
}

function combineQuantityCost(lines) {
  return groupBySimilarDescription(lines, (line) => line.description)
    .map((group, index) => {
      let quantity = 0
      let totalCost = 0
      for (const line of group.items) {
        quantity = roundMaterialAmount(quantity + (Number(line.quantity) || 0)) ?? quantity
        totalCost = roundMaterialUnitPrice(totalCost + (Number(line.totalCost) || 0)) ?? totalCost
      }
      const unitPrice = quantity ? roundMaterialUnitPrice(totalCost / quantity) ?? 0 : 0
      return {
        id: `request-${index}`,
        description: group.description,
        quantity,
        unitPrice,
        totalCost,
      }
    })
    .sort((left, right) => left.description.localeCompare(right.description))
}

function combineReceived(lines) {
  return groupBySimilarDescription(lines, (line) => line.description)
    .map((group, index) => {
      let quantity = 0
      for (const line of group.items) {
        quantity = roundMaterialAmount(quantity + (Number(line.quantity) || 0)) ?? quantity
      }
      return {
        id: `received-${index}`,
        date: latestDate(group.items.map((line) => line.date)),
        description: group.description,
        quantity,
      }
    })
    .sort((left, right) => left.description.localeCompare(right.description))
}

export const bulkMaterialRequest = createRegister({
  id: "request",
  segment: "bulk-material-request",
  storageKey: BULK_MATERIAL_REQUEST_STORAGE_KEY,
  noun: "bulk material request",
  title: "Bulk material request",
  dailyTitle: "Daily bulk material request",
  entryTitle: "Bulk material request entry",
  hubDescription:
    "Press + to create a daily file, then set its date inside the file. Quantities roll into the daily dashboard and project to date.",
  rollupNote:
    "Similar descriptions are written as one line and their quantities and total costs are added together.",
  entryColumns: [
    { key: "description", label: "Description", align: "left", kind: "text" },
    { key: "supplier", label: "Supplier", align: "left", kind: "text" },
    { key: "unit", label: "Unit", align: "left", kind: "text" },
    {
      key: "quantity",
      label: "Quantity of material requested",
      align: "right",
      kind: "number",
    },
    { key: "unitPrice", label: "Unit price", align: "right", kind: "money" },
    { key: "totalCost", label: "Total cost", align: "right", kind: "computed" },
  ],
  dashboardColumns: [
    { key: "description", label: "Description", align: "left", kind: "text" },
    {
      key: "quantity",
      label: "Quantity of material requested",
      align: "right",
      kind: "number",
      total: false,
    },
    { key: "totalCost", label: "Total cost", align: "right", kind: "computed" },
  ],
  createRow() {
    return {
      id: newRowId("bmr"),
      description: "",
      supplier: "",
      unit: "",
      quantity: "",
      unitPrice: "",
      totalCost: null,
    }
  },
  prepareRow(row) {
    const quantity = row?.quantity ?? ""
    const unitPrice = row?.unitPrice ?? ""
    return {
      id: row?.id || newRowId("bmr"),
      description: String(row?.description ?? ""),
      supplier: String(row?.supplier ?? ""),
      unit: String(row?.unit ?? ""),
      quantity,
      quantityFormula: String(row?.quantityFormula ?? ""),
      unitPrice,
      unitPriceFormula: String(row?.unitPriceFormula ?? ""),
      totalCost: roundMaterialUnitPrice(normalizeAmount(quantity) * normalizeUnitPrice(unitPrice)) ?? 0,
    }
  },
  rowHasEntry(row) {
    return Boolean(
      String(row?.description || "").trim() ||
        String(row?.supplier || "").trim() ||
        String(row?.unit || "").trim() ||
        normalizeAmount(row?.quantity) ||
        normalizeUnitPrice(row?.unitPrice)
    )
  },
  toLine(row) {
    return {
      description: String(row.description || "").trim() || "—",
      quantity: normalizeAmount(row.quantity),
      unitPrice: normalizeUnitPrice(row.unitPrice),
      totalCost: normalizeUnitPrice(row.totalCost),
    }
  },
  combineLines: combineQuantityCost,
})

export const materialReceipts = createRegister({
  id: "received",
  segment: "material-received",
  storageKey: MATERIAL_RECEIPT_STORAGE_KEY,
  noun: "material received",
  title: "Material received",
  dailyTitle: "Daily material received",
  entryTitle: "Material received entry",
  hubDescription:
    "Press + to create a daily file, then set its date inside the file. Quantity received rolls into the daily dashboard and project to date.",
  rollupNote:
    "Similar descriptions are written as one line and their quantities received are added together. Delivery note and supplier stay on the entry table.",
  entryColumns: [
    { key: "date", label: "Date", align: "left", kind: "date" },
    { key: "description", label: "Description", align: "left", kind: "text" },
    { key: "quantity", label: "Quantity received today", align: "right", kind: "number" },
    { key: "deliveryNote", label: "Delivery note", align: "left", kind: "text" },
    { key: "supplier", label: "Supplier", align: "left", kind: "text" },
  ],
  dashboardColumns: [
    { key: "date", label: "Date", align: "left", kind: "date" },
    { key: "description", label: "Description", align: "left", kind: "text" },
    { key: "quantity", label: "Quantity received today", align: "right", kind: "number" },
  ],
  createRow(dayId) {
    return {
      id: newRowId("mrc"),
      date: dayId || "",
      description: "",
      quantity: "",
      deliveryNote: "",
      supplier: "",
    }
  },
  prepareRow(row, dayId) {
    const date = DAY_ID.test(String(row?.date || "")) ? String(row.date) : dayId || ""
    return {
      id: row?.id || newRowId("mrc"),
      date,
      description: String(row?.description ?? ""),
      quantity: row?.quantity ?? "",
      quantityFormula: String(row?.quantityFormula ?? ""),
      deliveryNote: String(row?.deliveryNote ?? ""),
      supplier: String(row?.supplier ?? ""),
    }
  },
  rowHasEntry(row) {
    return Boolean(
      String(row?.description || "").trim() ||
        normalizeAmount(row?.quantity) ||
        String(row?.deliveryNote || "").trim() ||
        String(row?.supplier || "").trim()
    )
  },
  toLine(row, dayId) {
    return {
      date: DAY_ID.test(String(row.date || "")) ? row.date : dayId,
      description: String(row.description || "").trim() || "—",
      quantity: normalizeAmount(row.quantity),
    }
  },
  combineLines: combineReceived,
})

export function getMaterialRegister(kind) {
  return kind === "received" ? materialReceipts : bulkMaterialRequest
}
