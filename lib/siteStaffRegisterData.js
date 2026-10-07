import { getGroveItem, removeGroveItem, setGroveItem } from "@/lib/groveClientStore"
import { getMonthlyFiles } from "@/lib/projectFiles"
import { buildCarriedOverRows, isUntouchedRegister } from "@/lib/registerCarryOver"
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"

export const SITE_STAFF_REGISTER_STORAGE_KEY = "grove-site-staff-registers"

const IDENTITY_FIELDS = ["name", "role"]

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function parseMonthId(monthId) {
  const [year, month] = monthId.split("-").map(Number)
  return { year, month }
}

export function getMonthRegisterMeta(monthId) {
  const { year, month } = parseMonthId(monthId)
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthName = `${MONTHS[month - 1]} ${year}`

  return { year, month, daysInMonth, monthName }
}

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = getGroveItem(SITE_STAFF_REGISTER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return Promise.resolve()

  const serialized = JSON.stringify(store)
  // Update the in-memory cache immediately so ensure/reload cannot race.
  setGroveItem(SITE_STAFF_REGISTER_STORAGE_KEY, serialized)
  markSharedStorageLocalWrite(SITE_STAFF_REGISTER_STORAGE_KEY)

  return import("@/lib/saveToPostgres").then(({ writeGroveJson }) =>
    writeGroveJson(SITE_STAFF_REGISTER_STORAGE_KEY, store, { replace: true })
  )
}

function createEmptyAttendance(daysInMonth) {
  const attendance = {}
  for (let day = 1; day <= daysInMonth; day += 1) {
    attendance[String(day)] = null
  }
  return attendance
}

export function createEmptyRegisterRow(daysInMonth) {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `staff-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return {
    id,
    name: "",
    role: "",
    attendance: createEmptyAttendance(daysInMonth),
  }
}

export function createEmptyRegister(monthId) {
  const { daysInMonth, monthName } = getMonthRegisterMeta(monthId)

  return {
    monthId,
    monthName,
    daysInMonth,
    rows: [],
    updatedAt: new Date().toISOString(),
  }
}

function normalizeRegisterRow(row, daysInMonth) {
  const id =
    row?.id ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `staff-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

  return {
    id,
    name: row?.name ?? "",
    role: row?.role ?? "",
    attendance: {
      ...createEmptyAttendance(daysInMonth),
      ...(row?.attendance ?? {}),
    },
  }
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

/** New month register pre-filled with last month's names and roles, or null if there is none. */
function createCarriedOverRegister(projectRegisters, monthId) {
  const { daysInMonth } = getMonthRegisterMeta(monthId)
  const carried = buildCarriedOverRows(projectRegisters, monthId, {
    identityFields: IDENTITY_FIELDS,
    daysInMonth,
  })
  if (!carried) return null

  return {
    ...createEmptyRegister(monthId),
    ...(projectRegisters[monthId] ?? {}),
    rows: carried.rows,
    carriedOverFrom: carried.sourceMonthId,
  }
}

/**
 * A later month may already have its own names. Add anyone from the previous
 * month who is not listed yet, with blank attendance waiting to be marked.
 */
function appendMissingIdentities(projectRegisters, monthId) {
  const register = projectRegisters[monthId]
  if (!register) return false

  const sourceMonthId = Object.keys(projectRegisters)
    .filter((id) => id < monthId)
    .sort()
    .reverse()
    .find((id) => (projectRegisters[id]?.rows ?? []).some((row) => row?.id && rowHasIdentity(row)))
  if (!sourceMonthId) return false

  const existing = new Set((register.rows ?? []).filter(rowHasIdentity).map(identityKey))
  const { daysInMonth } = getMonthRegisterMeta(monthId)
  const extra = []

  for (const row of projectRegisters[sourceMonthId].rows ?? []) {
    if (!row?.id || !rowHasIdentity(row)) continue
    const key = identityKey(row)
    if (existing.has(key)) continue
    extra.push({
      id: `${String(row.id).split("--")[0]}--${monthId}`,
      name: row.name ?? "",
      role: row.role ?? "",
      attendance: createEmptyAttendance(daysInMonth),
    })
    existing.add(key)
  }

  if (extra.length === 0) return false

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

function carryMonthForward(projectRegisters, monthId, listedMonthIds) {
  if (isUntouchedRegister(projectRegisters[monthId])) {
    const carried = createCarriedOverRegister(projectRegisters, monthId)
    if (carried) {
      projectRegisters[monthId] = carried
      return true
    }
    if (!projectRegisters[monthId] && listedMonthIds.has(monthId)) {
      projectRegisters[monthId] = createEmptyRegister(monthId)
      return true
    }
    return false
  }

  return appendMissingIdentities(projectRegisters, monthId)
}

export function getSiteStaffRegisterData(projectId, monthId) {
  if (typeof window === "undefined") {
    return createEmptyRegister(monthId)
  }

  const store = readStore()
  const projectRegisters = store[projectId] ?? {}
  const existing =
    (isUntouchedRegister(projectRegisters[monthId]) &&
      createCarriedOverRegister(projectRegisters, monthId)) ||
    projectRegisters[monthId]

  if (!existing) {
    return createEmptyRegister(monthId)
  }

  const { daysInMonth, monthName } = getMonthRegisterMeta(monthId)

  return {
    ...createEmptyRegister(monthId),
    ...existing,
    monthId,
    monthName,
    daysInMonth,
    rows: (existing.rows ?? []).map((row) => normalizeRegisterRow(row, daysInMonth)),
  }
}

export function saveSiteStaffRegisterData(projectId, monthId, register) {
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
    ...createEmptyRegister(monthId),
    ...previous,
    ...register,
    monthId,
    rows,
    userEdited: true,
    updatedAt: new Date().toISOString(),
  }

  store[projectId] = projectRegisters
  writeStore(store)
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

export function ensureSiteStaffRegistersExist(projectId) {
  if (typeof window === "undefined") return false
  // Missing key means Postgres has not loaded yet. Writing now would publish an empty register.
  if (getGroveItem(SITE_STAFF_REGISTER_STORAGE_KEY) == null) return false

  const store = readStore()
  const projectRegisters = store[projectId] ?? {}
  let changed = false
  const listedMonthIds = new Set(getMonthlyFiles(projectId).map((file) => file.id))
  // Future months are carried over when read, so storing them ahead only lets the register run away.
  const lastMonthId = [...listedMonthIds, currentMonthId()].sort().at(-1)
  const monthIds = [...new Set([...listedMonthIds, ...Object.keys(projectRegisters)])]
    .filter((monthId) => monthId <= lastMonthId)
    .sort()

  for (const monthId of monthIds) {
    if (carryMonthForward(projectRegisters, monthId, listedMonthIds)) changed = true
  }

  if (changed) {
    store[projectId] = projectRegisters
    writeStore(store)
  }

  return changed
}

export function removeSiteStaffRegistersForProject(projectId) {
  if (typeof window === "undefined") return

  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllSiteStaffRegisters() {
  if (typeof window === "undefined") return
  removeGroveItem(SITE_STAFF_REGISTER_STORAGE_KEY)
}
