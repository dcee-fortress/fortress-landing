import { getGroveItem, removeGroveItem, setGroveItem } from "@/lib/groveClientStore"
import { getMonthlyFiles } from "@/lib/projectFiles"
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"
import { getMonthRegisterMeta } from "@/lib/siteStaffRegisterData"

export const INDUCTION_REGISTER_STORAGE_KEY = "grove-induction-registers"

export const INDUCTION_REGISTER_COLUMNS = [
  { field: "name", label: "Name", placeholder: "Full name" },
  { field: "idNumber", label: "ID Number", placeholder: "ID number" },
  { field: "phoneNumber", label: "Phone number", placeholder: "Phone number" },
  { field: "position", label: "Position", placeholder: "Position" },
  { field: "companyName", label: "Company name", placeholder: "Company name" },
]

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
    updatedAt: new Date().toISOString(),
  }

  store[projectId] = projectRegisters
  writeStore(store)
}

export function ensureInductionRegistersExist(projectId) {
  if (typeof window === "undefined") return false

  const store = readStore()
  const projectRegisters = store[projectId] ?? {}
  let changed = false

  for (const file of getMonthlyFiles(projectId)) {
    if (!projectRegisters[file.id]) {
      projectRegisters[file.id] = createEmptyInductionRegister(file.id)
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
