import { dayIdFromDate, parseDayId, getTodayDayId } from "@/lib/dailyFiles"
import { parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

export const DEFAULT_VAT_RATE = 15

export const CASH_BOOK_COLUMNS = [
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

const DELETED_DAYS_KEY = "__deletedDays__"

export function formatCashBookDate(dayId) {
  const date = parseDayId(dayId)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

export function formatVatDescription(rate = DEFAULT_VAT_RATE) {
  const cleaned = roundMaterialAmount(Number(rate)) ?? DEFAULT_VAT_RATE
  return `VAT@ ${cleaned}%`
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

function normalizeAmount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
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

/**
 * One daily cash book (petty cash, food cash). Each day has its own entry table;
 * weekly, monthly and project to date dashboards add up the daily files.
 */
export function createCashBook({ storageKey, rowIdPrefix, withVat, trashType, label }) {
  const store = createLocalStorageCache(storageKey, {})

  function dayKey(projectId, dayId) {
    return `${projectId}::${dayId}`
  }

  function readDeletedDayIds(value, projectId) {
    const bucket = value?.[DELETED_DAYS_KEY]
    if (!bucket || typeof bucket !== "object") return []
    const ids = bucket[projectId]
    return Array.isArray(ids) ? ids.filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(String(id))) : []
  }

  function getDeletedDayIds(projectId) {
    if (typeof window === "undefined" || !projectId) return []
    return readDeletedDayIds(store.read(), projectId)
  }

  function createRow(dayId = getTodayDayId()) {
    return {
      id: `${rowIdPrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      date: formatCashBookDate(dayId),
      description: "",
      cashIssuedTo: "",
      cashReceived: "",
      amountPaid: "",
      isVat: false,
      vatRate: null,
      cashBalance: null,
    }
  }

  function isVatRow(row) {
    if (!withVat || !row || typeof row !== "object") return false
    if (row.isVat === true) return true
    return /^VAT\s*@/i.test(String(row.description || "").trim())
  }

  function createVatRow(dayId, rate = DEFAULT_VAT_RATE) {
    return {
      id: `${rowIdPrefix}-vat-${dayId}`,
      date: formatCashBookDate(dayId),
      description: formatVatDescription(rate),
      cashIssuedTo: "",
      cashReceived: "",
      amountPaid: 0,
      isVat: true,
      vatRate: rate,
      cashBalance: null,
    }
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

  /**
   * With VAT on, keeps a compulsory VAT row once the user starts entering transactions.
   * VAT amount paid = total amount paid on other rows × rate% (default 15).
   */
  function syncRows(rows, dayId) {
    const list = Array.isArray(rows) ? rows : []
    const nonVat = list.filter((row) => !isVatRow(row))
    const started = nonVat.some(rowHasEntry)

    if (!started || !withVat) {
      return nonVat.length > 0 ? nonVat : [createRow(dayId)]
    }

    const existingVat = list.find((row) => isVatRow(row))
    const rate = existingVat ? parseVatRate(existingVat) : DEFAULT_VAT_RATE
    const paidBeforeVat = nonVat.reduce((sum, row) => sum + normalizeAmount(row.amountPaid), 0)
    const vatAmount = roundMaterialAmount(paidBeforeVat * (rate / 100)) ?? 0

    const vatRow = {
      ...(existingVat || createVatRow(dayId, rate)),
      id: existingVat?.id || `${rowIdPrefix}-vat-${dayId}`,
      date: formatCashBookDate(dayId),
      description: formatVatDescription(rate),
      cashIssuedTo: "",
      cashReceived: "",
      amountPaid: vatAmount,
      isVat: true,
      vatRate: rate,
    }

    return [...nonVat, vatRow]
  }

  function prepareRows(rows, dayId, openingBalance = 0) {
    return withRunningBalances(syncRows(rows, dayId), openingBalance)
  }

  function readDayRecord(projectId, dayId) {
    if (typeof window === "undefined" || !projectId || !dayId) {
      return { rows: [], receipts: [] }
    }
    const raw = store.read()[dayKey(projectId, dayId)]
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
    const next = { ...store.read() }
    const key = dayKey(projectId, dayId)
    const nextReceipts = (Array.isArray(receipts) ? receipts : [])
      .map(normalizeReceiptMeta)
      .filter(Boolean)
    const hasRows = Array.isArray(rows) && rows.some(rowHasEntry)

    if (!hasRows && nextReceipts.length === 0) {
      delete next[key]
    } else {
      next[key] = {
        rows: hasRows ? rows : [],
        receipts: nextReceipts,
      }
    }

    return store.write(next)
  }

  function cleanRowsForSave(rows, dayId) {
    return syncRows(rows, dayId).map((row) => {
      const vat = isVatRow(row)
      return {
        id: row.id || createRow(dayId).id,
        date: formatCashBookDate(dayId),
        description: vat ? formatVatDescription(parseVatRate(row)) : String(row.description ?? ""),
        cashIssuedTo: vat ? "" : String(row.cashIssuedTo ?? ""),
        cashReceived: vat ? "" : row.cashReceived ?? "",
        cashReceivedFormula: vat ? "" : String(row.cashReceivedFormula ?? ""),
        amountPaid: vat ? normalizeAmount(row.amountPaid) : row.amountPaid ?? "",
        amountPaidFormula: vat ? "" : String(row.amountPaidFormula ?? ""),
        isVat: vat,
        vatRate: vat ? parseVatRate(row) : null,
      }
    })
  }

  function getDayIds(projectId) {
    if (typeof window === "undefined" || !projectId) return []
    const value = store.read()
    const prefix = `${projectId}::`
    return Object.keys(value)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
      .filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId))
      .filter((dayId) => {
        const { rows, receipts } = readDayRecord(projectId, dayId)
        return rows.some(rowHasEntry) || receipts.length > 0
      })
      .sort((left, right) => left.localeCompare(right))
  }

  /**
   * Every day starts at a zero cash balance. A day's balance never carries into the next
   * daily file; it only adds up into the weekly, monthly and project to date dashboards.
   */
  function getOpeningBalanceForDay() {
    return 0
  }

  function getRows(projectId, dayId) {
    const opening = getOpeningBalanceForDay(projectId, dayId)
    return prepareRows(readDayRecord(projectId, dayId).rows, dayId, opening)
  }

  function hasDataForDay(projectId, dayId) {
    return getRows(projectId, dayId).some(rowHasEntry)
  }

  function getHistoryRows(projectId, excludeDayId = "") {
    return getDayIds(projectId)
      .filter((dayId) => dayId !== excludeDayId)
      .flatMap((dayId) => readDayRecord(projectId, dayId).rows)
      .filter((row) => !isVatRow(row))
  }

  function getReceipts(projectId, dayId) {
    return readDayRecord(projectId, dayId).receipts
  }

  function saveReceipts(projectId, dayId, receipts) {
    if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
    const { rows } = readDayRecord(projectId, dayId)
    const cleaned = rows.some(rowHasEntry) ? cleanRowsForSave(rows, dayId) : []
    return writeDayRecord(projectId, dayId, cleaned.some(rowHasEntry) ? cleaned : [], receipts)
  }

  function saveRows(projectId, dayId, rows) {
    if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
    const { receipts } = readDayRecord(projectId, dayId)
    const cleaned = cleanRowsForSave(rows, dayId)
    // Only empty starter rows — don't persist row data yet (keep receipts if any).
    const persistableRows = cleaned.some(rowHasEntry) ? cleaned : []
    return writeDayRecord(projectId, dayId, persistableRows, receipts)
  }

  function getDayTotals(projectId, dayId) {
    const rows = getRows(projectId, dayId)
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

  function getTotalsForDayIds(projectId, dayIds) {
    const ids = [...new Set(dayIds || [])].sort((a, b) => a.localeCompare(b))
    let cashReceived = 0
    let amountPaid = 0
    let closingBalance = 0

    for (const dayId of ids) {
      const totals = getDayTotals(projectId, dayId)
      cashReceived += totals.cashReceived
      amountPaid += totals.amountPaid
      closingBalance += totals.closingBalance
    }

    return {
      cashReceived: roundMaterialAmount(cashReceived) ?? 0,
      amountPaid: roundMaterialAmount(amountPaid) ?? 0,
      openingBalance: 0,
      closingBalance: roundMaterialAmount(closingBalance) ?? 0,
      dayCount: ids.filter((dayId) => hasDataForDay(projectId, dayId)).length,
    }
  }

  /**
   * Dashboard lines across days. Same description (case-insensitive) adds up
   * cash received, amount paid and cash balance.
   */
  function getDashboardLinesForDayIds(projectId, dayIds) {
    const merged = new Map()

    for (const dayId of [...new Set(dayIds || [])].sort((a, b) => a.localeCompare(b))) {
      for (const row of getRows(projectId, dayId)) {
        const received = normalizeAmount(row.cashReceived)
        const paid = normalizeAmount(row.amountPaid)
        if (!rowHasEntry(row) && !(isVatRow(row) && paid)) continue

        const description = String(row.description || "").trim() || "No description"
        const key = description.toLowerCase()
        const existing = merged.get(key)
        if (existing) {
          existing.cashReceived += received
          existing.amountPaid += paid
        } else {
          merged.set(key, {
            id: key,
            description,
            cashReceived: received,
            amountPaid: paid,
          })
        }
      }
    }

    return [...merged.values()].map((line) => ({
      ...line,
      cashReceived: roundMaterialAmount(line.cashReceived) ?? 0,
      amountPaid: roundMaterialAmount(line.amountPaid) ?? 0,
      cashBalance: roundMaterialAmount(line.cashReceived - line.amountPaid) ?? 0,
    }))
  }

  function getProjectTotals(projectId) {
    return getTotalsForDayIds(projectId, getDayIds(projectId))
  }

  function getDayIdsInWeek(projectId, weekId) {
    const start = parseDayId(weekId)
    const end = dayIdFromDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
    return getDayIds(projectId).filter((dayId) => dayId >= weekId && dayId <= end)
  }

  function getDayIdsInMonth(projectId, monthId) {
    return getDayIds(projectId).filter((dayId) => dayId.startsWith(`${monthId}-`))
  }

  function getEntryStatus(projectId, file) {
    const hasData = hasDataForDay(projectId, file.id)
    const isToday = file.id === getTodayDayId()

    if (hasData) {
      return {
        key: "in-progress",
        label: isToday ? "In progress" : "Saved",
        description: isToday
          ? `${label} entered today — you can still edit`
          : "Saved — you can still edit this file at any time",
      }
    }

    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: `Ready for ${label.toLowerCase()} entry`,
    }
  }

  /**
   * Clears this day's entry and hides the file from the daily list.
   * A snapshot is kept in Settings → Recycle files for 90 days.
   */
  async function deleteDay(projectId, dayId) {
    if (typeof window === "undefined" || !projectId || !dayId) {
      return { ok: false, message: "Missing project or day." }
    }

    const record = readDayRecord(projectId, dayId)
    const { addTrashEntry } = await import("@/lib/fileTrash")
    const { getProjectById } = await import("@/lib/projectList")
    const { formatDayLabelFromId } = await import("@/lib/progressReportGenerator")

    await addTrashEntry({
      type: trashType,
      projectId,
      projectName: getProjectById(projectId)?.name || "Project",
      dayId,
      label: formatDayLabelFromId(dayId) || dayId,
      snapshot: {
        rows: record.rows,
        receipts: record.receipts,
      },
    })

    const next = { ...store.read() }
    delete next[dayKey(projectId, dayId)]

    const deleted = new Set(readDeletedDayIds(next, projectId))
    deleted.add(dayId)
    next[DELETED_DAYS_KEY] = {
      ...(next[DELETED_DAYS_KEY] && typeof next[DELETED_DAYS_KEY] === "object"
        ? next[DELETED_DAYS_KEY]
        : {}),
      [projectId]: [...deleted].sort(),
    }

    await store.write(next)
    return { ok: true }
  }

  async function restoreDayFromTrash(entry) {
    if (!entry?.projectId || !entry?.dayId) {
      return { ok: false, message: "Trash entry is incomplete." }
    }

    const next = { ...store.read() }
    const key = dayKey(entry.projectId, entry.dayId)
    const rows = Array.isArray(entry.snapshot?.rows) ? entry.snapshot.rows : []
    const receipts = Array.isArray(entry.snapshot?.receipts) ? entry.snapshot.receipts : []

    if (rows.some(rowHasEntry) || receipts.length > 0) {
      next[key] = { rows, receipts }
    }

    const deleted = new Set(readDeletedDayIds(next, entry.projectId))
    deleted.delete(entry.dayId)
    next[DELETED_DAYS_KEY] = {
      ...(next[DELETED_DAYS_KEY] && typeof next[DELETED_DAYS_KEY] === "object"
        ? next[DELETED_DAYS_KEY]
        : {}),
      [entry.projectId]: [...deleted].sort(),
    }

    await store.write(next)
    return { ok: true }
  }

  return {
    storageKey,
    withVat: Boolean(withVat),
    createRow,
    isVatRow,
    prepareRows,
    getDeletedDayIds,
    getOpeningBalanceForDay,
    getRows,
    saveRows,
    getReceipts,
    saveReceipts,
    getHistoryRows,
    hasDataForDay,
    getDayIds,
    getDayTotals,
    getTotalsForDayIds,
    getDashboardLinesForDayIds,
    getProjectTotals,
    getDayIdsInWeek,
    getDayIdsInMonth,
    getEntryStatus,
    deleteDay,
    restoreDayFromTrash,
  }
}
