import { getTodayDayId } from "@/lib/dailyFiles"
import { getGroveItem, removeGroveItem, setGroveItem } from "@/lib/groveClientStore"
import { getMonthlyFiles } from "@/lib/projectFiles"
import { isUntouchedRegister } from "@/lib/registerCarryOver"
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"
import { getMonthRegisterMeta } from "@/lib/siteStaffRegisterData"

export const INDUCTION_REGISTER_STORAGE_KEY = "grove-induction-registers"

export const INDUCTION_REGISTER_COLUMNS = [
  { field: "date", label: "Date", type: "date" },
  { field: "name", label: "Name", placeholder: "Full name" },
  { field: "idNumber", label: "ID Number", placeholder: "ID number" },
  { field: "phoneNumber", label: "Phone number", placeholder: "Phone number" },
  { field: "position", label: "Position", placeholder: "Position" },
  { field: "companyName", label: "Company name", placeholder: "Company name" },
]

/** Date is excluded: a row with only a date has no person on it yet. */
const IDENTITY_FIELDS = INDUCTION_REGISTER_COLUMNS.filter((column) => column.type !== "date").map(
  (column) => column.field
)

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = getGroveItem(INDUCTION_REGISTER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return Promise.resolve()

  const serialized = JSON.stringify(store)
  setGroveItem(INDUCTION_REGISTER_STORAGE_KEY, serialized)
  markSharedStorageLocalWrite(INDUCTION_REGISTER_STORAGE_KEY)

  return import("@/lib/saveToPostgres").then(({ writeGroveJson }) =>
    writeGroveJson(INDUCTION_REGISTER_STORAGE_KEY, store, { replace: true })
  )
}

function createRowId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `induction-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyInductionRow() {
  return {
    id: createRowId(),
    date: getTodayDayId(),
    name: "",
    idNumber: "",
    phoneNumber: "",
    position: "",
    companyName: "",
  }
}

export function createEmptyInductionRegister(monthId) {
  const { monthName } = getMonthRegisterMeta(monthId)

  return {
    monthId,
    monthName,
    rows: [],
    updatedAt: new Date().toISOString(),
  }
}

function normalizeInductionRow(row) {
  return {
    id: row?.id || createRowId(),
    date: row?.date ?? "",
    name: row?.name ?? "",
    idNumber: row?.idNumber ?? "",
    phoneNumber: row?.phoneNumber ?? "",
    position: row?.position ?? "",
    companyName: row?.companyName ?? "",
  }
}

export function getInductionRegisterData(projectId, monthId) {
  if (typeof window === "undefined") {
    return createEmptyInductionRegister(monthId)
  }

  const store = readStore()
  const projectRegisters = store[projectId] ?? {}
  const existing = projectRegisters[monthId]

  if (!existing) {
    return createEmptyInductionRegister(monthId)
  }

  const { monthName } = getMonthRegisterMeta(monthId)

  return {
    ...createEmptyInductionRegister(monthId),
    ...existing,
    monthId,
    monthName,
    rows: (existing.rows ?? []).map(normalizeInductionRow),
  }
}

export function formatInductionDate(dayId) {
  const match = String(dayId ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return String(dayId ?? "")
  return `${Number(match[3])}/${Number(match[2])}/${match[1]}`
}

/** Fills every empty date cell with today's date. Returns null when nothing was empty. */
export function fillMissingInductionDates(register) {
  const rows = register?.rows ?? []
  if (!rows.some((row) => !String(row?.date ?? "").trim())) return null

  const today = getTodayDayId()
  return {
    ...register,
    rows: rows.map((row) => (String(row?.date ?? "").trim() ? row : { ...row, date: today })),
  }
}

function mergeRegisterRowsById(previousRows, nextRows) {
  const byId = new Map()
  for (const row of previousRows) {
    if (row?.id) byId.set(row.id, row)
  }
  for (const row of nextRows) {
    if (row?.id) byId.set(row.id, row)
  }
  return [...byId.values()]
}

export function saveInductionRegisterData(projectId, monthId, register) {
  const store = readStore()
  const projectRegisters = { ...(store[projectId] ?? {}) }
  const previous = projectRegisters[monthId]
  const previousRows = Array.isArray(previous?.rows) ? previous.rows : []
  const nextRows = Array.isArray(register?.rows) ? register.rows : []

  const rows =
    nextRows.length >= previousRows.length
      ? nextRows
      : mergeRegisterRowsById(previousRows, nextRows)

  projectRegisters[monthId] = {
    ...createEmptyInductionRegister(monthId),
    ...previous,
    ...register,
    monthId,
    rows: rows.map(normalizeInductionRow),
    userEdited: true,
    updatedAt: new Date().toISOString(),
  }

  store[projectId] = projectRegisters
  writeStore(store)
}

function rowHasIdentity(row) {
  return IDENTITY_FIELDS.some((field) => String(row?.[field] ?? "").trim())
}

function identityKey(row) {
  return IDENTITY_FIELDS.map((field) => String(row?.[field] ?? "").trim().toLowerCase()).join("|")
}

function currentMonthId() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function findSourceMonthId(projectRegisters, monthId) {
  return Object.keys(projectRegisters ?? {})
    .filter((id) => id < monthId)
    .sort()
    .reverse()
    .find((id) => (projectRegisters[id]?.rows ?? []).some((row) => row?.id && rowHasIdentity(row)))
}

function carriedInductionRow(row, monthId) {
  const next = {
    id: `${String(row.id).split("--")[0]}--${monthId}`,
    date: getTodayDayId(),
  }
  for (const field of IDENTITY_FIELDS) next[field] = row?.[field] ?? ""
  return next
}

function createCarriedOverRegister(projectRegisters, monthId) {
  const sourceMonthId = findSourceMonthId(projectRegisters, monthId)
  if (!sourceMonthId) return null

  const rows = projectRegisters[sourceMonthId].rows
    .filter((row) => row?.id && rowHasIdentity(row))
    .map((row) => carriedInductionRow(row, monthId))
  if (rows.length === 0) return null

  return {
    ...createEmptyInductionRegister(monthId),
    ...(projectRegisters[monthId] ?? {}),
    rows,
    carriedOverFrom: sourceMonthId,
  }
}

/**
 * Current month may already have new names. Add anyone written in an earlier
 * month who is not listed yet, and leave a blank row at the bottom for the next entry.
 */
function rollMissingIdentities(projectRegisters, monthId) {
  const register = projectRegisters[monthId]
  if (!register || register.carriedOverFrom) return false

  const sourceMonthId = findSourceMonthId(projectRegisters, monthId)
  if (!sourceMonthId) return false

  const existing = new Set(
    (register.rows ?? []).filter((row) => rowHasIdentity(row)).map((row) => identityKey(row))
  )
  const extra = []
  for (const row of projectRegisters[sourceMonthId].rows ?? []) {
    if (!row?.id || !rowHasIdentity(row)) continue
    const key = identityKey(row)
    if (existing.has(key)) continue
    extra.push(carriedInductionRow(row, monthId))
    existing.add(key)
  }

  const named = []
  const blank = []
  for (const row of register.rows ?? []) {
    if (rowHasIdentity(row)) named.push(row)
    else blank.push(row)
  }

  projectRegisters[monthId] = {
    ...register,
    rows: [...named, ...extra, ...blank],
    carriedOverFrom: sourceMonthId,
    updatedAt: new Date().toISOString(),
  }
  return true
}

export function ensureInductionRegistersExist(projectId) {
  if (typeof window === "undefined") return false
  // Missing key means Postgres has not loaded yet. Writing now would publish an empty register.
  if (getGroveItem(INDUCTION_REGISTER_STORAGE_KEY) == null) return false

  const store = readStore()
  const projectRegisters = store[projectId] ?? {}
  let changed = false
  const currentMonth = currentMonthId()

  for (const monthId of getMonthlyFiles(projectId).map((file) => file.id).sort()) {
    if (isUntouchedRegister(projectRegisters[monthId])) {
      const carried = createCarriedOverRegister(projectRegisters, monthId)
      if (carried) {
        projectRegisters[monthId] = carried
        changed = true
      } else if (!projectRegisters[monthId]) {
        projectRegisters[monthId] = createEmptyInductionRegister(monthId)
        changed = true
      }
      continue
    }

    if (monthId === currentMonth && rollMissingIdentities(projectRegisters, monthId)) {
      changed = true
    }
  }

  if (changed) {
    store[projectId] = projectRegisters
    writeStore(store)
  }

  return changed
}

export function removeInductionRegistersForProject(projectId) {
  if (typeof window === "undefined") return

  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllInductionRegisters() {
  if (typeof window === "undefined") return
  removeGroveItem(INDUCTION_REGISTER_STORAGE_KEY)
}
