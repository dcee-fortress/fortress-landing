import { dayIdFromDate, parseDayId, getTodayDayId } from "@/lib/dailyFiles"
import { parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

export const PETTY_CASH_STORAGE_KEY = "grove-petty-cash"
export const DEFAULT_VAT_RATE = 15

const pettyCashStore = createLocalStorageCache(PETTY_CASH_STORAGE_KEY, {})

export const PETTY_CASH_COLUMNS = [
  { key: "date", label: "Date", align: "left", editable: false },
  {
    key: "description",
    label: "Description of transaction",
    align: "left",
    editable: true,
  },
  {
    key: "cashIssuedTo",
    label: "Cash issued to?",
    align: "left",
    editable: true,
  },
  {
    key: "cashReceived",
    label: "Cash received",
    align: "right",
    editable: true,
    numeric: true,
  },
  {
    key: "amountPaid",
    label: "Amount paid",
    align: "right",
    editable: true,
    numeric: true,
  },
  {
    key: "cashBalance",
    label: "Cash balance",
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

export function getPettyCashDeletedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  return readDeletedDayIds(pettyCashStore.read(), projectId)
}

export function isPettyCashDayDeleted(projectId, dayId) {
  return getPettyCashDeletedDayIds(projectId).includes(dayId)
}

export function formatPettyCashDate(dayId) {
  const date = parseDayId(dayId)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

export function createPettyCashRow(dayId = getTodayDayId()) {
  return {
    id: `pc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    date: formatPettyCashDate(dayId),
    description: "",
    cashIssuedTo: "",
    cashReceived: "",
    amountPaid: "",
    isVat: false,
    vatRate: null,
    cashBalance: null,
  }
}

export function formatVatDescription(rate = DEFAULT_VAT_RATE) {
  const cleaned = roundMaterialAmount(Number(rate)) ?? DEFAULT_VAT_RATE
  return `VAT@ ${cleaned}%`
}

export function isVatRow(row) {
  if (!row || typeof row !== "object") return false
  if (row.isVat === true) return true
  return /^VAT\s*@/i.test(String(row.description || "").trim())
}

export function parseVatRate(rowOrDescription) {
  if (rowOrDescription && typeof rowOrDescription === "object") {
    const stored = Number(rowOrDescription.vatRate)
    if (Number.isFinite(stored) && stored >= 0) return stored
    return parseVatRate(rowOrDescription.description)
  }

  const match = String(rowOrDescription || "").match(/VAT\s*@\s*([0-9]+(?:\.[0-9]+)?)\s*%?/i)
  if (!match) return DEFAULT_VAT_RATE
  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_VAT_RATE
}

export function createVatRow(dayId = getTodayDayId(), rate = DEFAULT_VAT_RATE) {
  return {
    id: `pc-vat-${dayId}`,
    date: formatPettyCashDate(dayId),
    description: formatVatDescription(rate),
    cashIssuedTo: "",
    cashReceived: "",
    amountPaid: 0,
    isVat: true,
    vatRate: rate,
    cashBalance: null,
  }
}

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
}

function rowHasEntry(row) {
  if (!row || typeof row !== "object" || isVatRow(row)) return false
  return Boolean(
    String(row.description || "").trim() ||
      String(row.cashIssuedTo || "").trim() ||
      normalizeAmount(row.cashReceived) ||
      normalizeAmount(row.amountPaid)
  )
}

export function hasStartedPettyCashEntry(rows) {
  return (Array.isArray(rows) ? rows : []).some(rowHasEntry)
}

/**
 * Keeps a compulsory VAT row once the user starts entering transactions.
 * VAT amount paid = total amount paid on other rows × rate% (default 15).
 * Cash balance then uses cash received − amount paid including VAT.
 */
export function syncPettyCashVat(rows, dayId) {
  const list = Array.isArray(rows) ? rows : []
  const nonVat = list.filter((row) => !isVatRow(row))
  const existingVat = list.find((row) => isVatRow(row))
  const started = nonVat.some(rowHasEntry)

  if (!started) {
    return nonVat.length > 0 ? nonVat : [createPettyCashRow(dayId)]
  }

  const rate = existingVat ? parseVatRate(existingVat) : DEFAULT_VAT_RATE
  const paidBeforeVat = nonVat.reduce((sum, row) => sum + normalizeAmount(row.amountPaid), 0)
  const vatAmount = roundMaterialAmount(paidBeforeVat * (rate / 100)) ?? 0

  const vatRow = {
    ...(existingVat || createVatRow(dayId, rate)),
    id: existingVat?.id || `pc-vat-${dayId}`,
    date: formatPettyCashDate(dayId),
    description: formatVatDescription(rate),
    cashIssuedTo: "",
    cashReceived: "",
    amountPaid: vatAmount,
    isVat: true,
    vatRate: rate,
  }

  return [...nonVat, vatRow]
}

export function withRunningBalances(rows, openingBalance = 0) {
  let balance = roundMaterialAmount(openingBalance) ?? 0
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const received = normalizeAmount(row.cashReceived)
    const paid = normalizeAmount(row.amountPaid)
    balance = roundMaterialAmount(balance + received - paid) ?? 0
    return {
      ...row,
      cashBalance: balance,
    }
  })
}

export function preparePettyCashRows(rows, dayId, openingBalance = 0) {
  return withRunningBalances(syncPettyCashVat(rows, dayId), openingBalance)
}

function normalizeReceiptMeta(receipt) {
  if (!receipt || typeof receipt !== "object") return null
  const id = String(receipt.id || "").trim()
  if (!id) return null
  const url = String(receipt.url || "").trim()
  return {
    id,
    name: String(receipt.name || "receipt.jpg"),
    type: String(receipt.type || "image/jpeg"),
    size: Number(receipt.size) || 0,
    uploadedAt: String(receipt.uploadedAt || new Date().toISOString()),
    ...(url ? { url } : {}),
  }
}

function readDayRecord(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { rows: [], receipts: [] }
  }
  const raw = pettyCashStore.read()[dayKey(projectId, dayId)]
  if (Array.isArray(raw)) {
    return { rows: raw, receipts: [] }
  }
  if (raw && typeof raw === "object") {
    return {
      rows: Array.isArray(raw.rows) ? raw.rows : [],
      receipts: (Array.isArray(raw.receipts) ? raw.receipts : [])
        .map(normalizeReceiptMeta)
        .filter(Boolean),
    }
  }
  return { rows: [], receipts: [] }
}

function writeDayRecord(projectId, dayId, rows, receipts) {
  const store = { ...pettyCashStore.read() }
  const key = dayKey(projectId, dayId)
  const nextReceipts = (Array.isArray(receipts) ? receipts : [])
    .map(normalizeReceiptMeta)
    .filter(Boolean)
  const hasRows = Array.isArray(rows) && rows.some(rowHasEntry)

  if (!hasRows && nextReceipts.length === 0) {
    delete store[key]
  } else {
    store[key] = {
      rows: hasRows ? rows : [],
      receipts: nextReceipts,
    }
  }

  return pettyCashStore.write(store)
}

export function getPettyCashDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = pettyCashStore.read()
  const prefix = `${projectId}::`
  return Object.keys(store)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
    .filter((dayId) => {
      const { rows, receipts } = readDayRecord(projectId, dayId)
      return rows.some(rowHasEntry) || receipts.length > 0
    })
    .sort((left, right) => left.localeCompare(right))
}

export function hasPettyCashDataForDay(projectId, dayId) {
  return getPettyCashRows(projectId, dayId).some(rowHasEntry)
}

export function getOpeningBalanceForDay(projectId, dayId) {
  if (!projectId || !dayId) return 0

  const previousIds = getPettyCashDayIds(projectId).filter((id) => id < dayId)
  let balance = 0

  for (const id of previousIds) {
    const rows = preparePettyCashRows(readRawRows(projectId, id), id, balance)
    if (rows.length > 0) {
      balance = rows[rows.length - 1].cashBalance ?? balance
    }
  }

  return balance
}

function readRawRows(projectId, dayId) {
  return readDayRecord(projectId, dayId).rows
}

export function getPettyCashReceipts(projectId, dayId) {
  return readDayRecord(projectId, dayId).receipts
}

export function savePettyCashReceipts(projectId, dayId, receipts) {
  if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
  const { rows } = readDayRecord(projectId, dayId)
  const prepared = rows.some(rowHasEntry) ? syncPettyCashVat(rows, dayId) : []
  const cleaned = prepared.map((row) => ({
    id: row.id || createPettyCashRow(dayId).id,
    date: formatPettyCashDate(dayId),
    description: isVatRow(row)
      ? formatVatDescription(parseVatRate(row))
      : String(row.description ?? ""),
    cashIssuedTo: isVatRow(row) ? "" : String(row.cashIssuedTo ?? ""),
    cashReceived: isVatRow(row) ? "" : row.cashReceived ?? "",
    amountPaid: isVatRow(row) ? normalizeAmount(row.amountPaid) : row.amountPaid ?? "",
    isVat: isVatRow(row),
    vatRate: isVatRow(row) ? parseVatRate(row) : null,
  }))
  return writeDayRecord(projectId, dayId, cleaned.some(rowHasEntry) ? cleaned : [], receipts)
}

export function getPettyCashRows(projectId, dayId) {
  const opening = getOpeningBalanceForDay(projectId, dayId)
  return preparePettyCashRows(readRawRows(projectId, dayId), dayId, opening)
}

export function savePettyCashRows(projectId, dayId, rows) {
  if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
  const { receipts } = readDayRecord(projectId, dayId)
  const prepared = syncPettyCashVat(rows, dayId)
  const cleaned = prepared.map((row) => ({
    id: row.id || createPettyCashRow(dayId).id,
    date: formatPettyCashDate(dayId),
    description: isVatRow(row)
      ? formatVatDescription(parseVatRate(row))
      : String(row.description ?? ""),
    cashIssuedTo: isVatRow(row) ? "" : String(row.cashIssuedTo ?? ""),
    cashReceived: isVatRow(row) ? "" : row.cashReceived ?? "",
    amountPaid: isVatRow(row) ? normalizeAmount(row.amountPaid) : row.amountPaid ?? "",
    isVat: isVatRow(row),
    vatRate: isVatRow(row) ? parseVatRate(row) : null,
  }))

  // Only empty starter rows — don't persist row data yet (keep receipts if any).
  const persistableRows = cleaned.some(rowHasEntry) ? cleaned : []
  return writeDayRecord(projectId, dayId, persistableRows, receipts)
}

export function getPettyCashDayTotals(projectId, dayId) {
  const rows = getPettyCashRows(projectId, dayId)
  let cashReceived = 0
  let amountPaidBeforeVat = 0
  let vatAmount = 0

  for (const row of rows) {
    if (isVatRow(row)) {
      vatAmount += normalizeAmount(row.amountPaid)
    } else {
      cashReceived += normalizeAmount(row.cashReceived)
      amountPaidBeforeVat += normalizeAmount(row.amountPaid)
    }
  }

  const amountPaid = roundMaterialAmount(amountPaidBeforeVat + vatAmount) ?? 0
  const openingBalance = getOpeningBalanceForDay(projectId, dayId)
  const closingBalance =
    rows.length > 0 ? (rows[rows.length - 1].cashBalance ?? openingBalance) : openingBalance

  return {
    cashReceived: roundMaterialAmount(cashReceived) ?? 0,
    amountPaid,
    amountPaidBeforeVat: roundMaterialAmount(amountPaidBeforeVat) ?? 0,
    vatAmount: roundMaterialAmount(vatAmount) ?? 0,
    openingBalance,
    closingBalance,
    rowCount: rows.filter(rowHasEntry).length,
  }
}

export function getPettyCashTotalsForDayIds(projectId, dayIds) {
  const ids = [...new Set(dayIds || [])].sort((a, b) => a.localeCompare(b))
  let cashReceived = 0
  let amountPaid = 0
  let openingBalance = ids.length > 0 ? getOpeningBalanceForDay(projectId, ids[0]) : 0
  let closingBalance = openingBalance

  for (const dayId of ids) {
    const totals = getPettyCashDayTotals(projectId, dayId)
    cashReceived += totals.cashReceived
    amountPaid += totals.amountPaid
    closingBalance = totals.closingBalance
  }

  return {
    cashReceived: roundMaterialAmount(cashReceived) ?? 0,
    amountPaid: roundMaterialAmount(amountPaid) ?? 0,
    openingBalance,
    closingBalance,
    dayCount: ids.filter((dayId) => hasPettyCashDataForDay(projectId, dayId)).length,
  }
}

export function getPettyCashProjectTotals(projectId) {
  return getPettyCashTotalsForDayIds(projectId, getPettyCashDayIds(projectId))
}

export function getPettyCashDayIdsInWeek(projectId, weekId) {
  const start = parseDayId(weekId)
  const end = dayIdFromDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
  return getPettyCashDayIds(projectId).filter((dayId) => dayId >= weekId && dayId <= end)
}

export function getPettyCashDayIdsInMonth(projectId, monthId) {
  return getPettyCashDayIds(projectId).filter((dayId) => dayId.startsWith(`${monthId}-`))
}

export function getPettyCashEntryStatus(projectId, file) {
  const hasData = hasPettyCashDataForDay(projectId, file.id)
  const isToday = file.id === getTodayDayId()

  if (isToday && !hasData) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for petty cash entry",
    }
  }

  if (hasData) {
    return {
      key: "in-progress",
      label: isToday ? "In progress" : "Saved",
      description: isToday
        ? "Petty cash entered today — you can still edit"
        : "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for petty cash entry",
  }
}

/**
 * Clears this day's petty cash entry and hides the file from the petty cash daily list.
 * A snapshot is kept in Settings → Recycle files for 90 days.
 */
export async function deletePettyCashDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { ok: false, message: "Missing project or day." }
  }

  const record = readDayRecord(projectId, dayId)
  const { addTrashEntry, TRASH_ENTRY_TYPES } = await import("@/lib/fileTrash")
  const { getProjectById } = await import("@/lib/projectList")
  const { formatDayLabelFromId } = await import("@/lib/progressReportGenerator")

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.PETTY_CASH_DAILY,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId,
    label: formatDayLabelFromId(dayId) || dayId,
    snapshot: {
      rows: record.rows,
      receipts: record.receipts,
    },
  })

  const store = { ...pettyCashStore.read() }
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

  await pettyCashStore.write(store)
  return { ok: true }
}

export async function restorePettyCashDayFromTrash(entry) {
  if (!entry?.projectId || !entry?.dayId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  const store = { ...pettyCashStore.read() }
  const key = dayKey(entry.projectId, entry.dayId)
  const rows = Array.isArray(entry.snapshot?.rows) ? entry.snapshot.rows : []
  const receipts = Array.isArray(entry.snapshot?.receipts) ? entry.snapshot.receipts : []

  if (rows.some(rowHasEntry) || receipts.length > 0) {
    store[key] = { rows, receipts }
  }

  const deleted = new Set(readDeletedDayIds(store, entry.projectId))
  deleted.delete(entry.dayId)
  store[DELETED_DAYS_KEY] = {
    ...(store[DELETED_DAYS_KEY] && typeof store[DELETED_DAYS_KEY] === "object"
      ? store[DELETED_DAYS_KEY]
      : {}),
    [entry.projectId]: [...deleted].sort(),
  }

  await pettyCashStore.write(store)
  return { ok: true }
}
