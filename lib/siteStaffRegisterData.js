import { getGroveItem, removeGroveItem, setGroveItem } from "@/lib/groveClientStore"
import { getMonthlyFiles } from "@/lib/projectFiles"
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"

export const SITE_STAFF_REGISTER_STORAGE_KEY = "grove-site-staff-registers"

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

export function getSiteStaffRegisterData(projectId, monthId) {
  if (typeof window === "undefined") {
    return createEmptyRegister(monthId)
  }

  const store = readStore()
  const projectRegisters = store[projectId] ?? {}
  const existing = projectRegisters[monthId]

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

  const store = readStore()
  const projectRegisters = store[projectId] ?? {}
  let changed = false

  for (const file of getMonthlyFiles(projectId)) {
    if (!projectRegisters[file.id]) {
      projectRegisters[file.id] = createEmptyRegister(file.id)
      changed = true
    }
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
