import { getGroveItem, removeGroveItem } from "@/lib/groveClientStore"
import { getMonthlyFiles } from "@/lib/projectFiles"

export const PLANT_OPERATOR_REGISTER_STORAGE_KEY = "grove-plant-operator-registers"

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
    const raw = getGroveItem(PLANT_OPERATOR_REGISTER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return Promise.resolve()
  return import("@/lib/saveToPostgres").then(({ writeGroveJson }) =>
    writeGroveJson(PLANT_OPERATOR_REGISTER_STORAGE_KEY, store, { replace: true })
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
      : `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return {
    id,
    supplier: "",
    plant: "",
    plantNumber: "",
    operatorName: "",
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
      : `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

  return {
    id,
    supplier: row?.supplier ?? "",
    plant: row?.plant ?? "",
    plantNumber: row?.plantNumber ?? "",
    operatorName: row?.operatorName ?? "",
    attendance: {
      ...createEmptyAttendance(daysInMonth),
      ...(row?.attendance ?? {}),
    },
  }
}

export function getPlantOperatorRegisterData(projectId, monthId) {
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

export function savePlantOperatorRegisterData(projectId, monthId, register) {
  const store = readStore()
  const projectRegisters = store[projectId] ?? {}

  projectRegisters[monthId] = {
    ...register,
    monthId,
    updatedAt: new Date().toISOString(),
  }

  store[projectId] = projectRegisters
  writeStore(store)
}

export function ensurePlantOperatorRegistersExist(projectId) {
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

export function cycleAttendanceValue(current) {
  if (current === null || current === undefined || current === "") return "present"
  if (current === "present") return "absent"
  return null
}

export function nextAttendanceFromClick(current) {
  return current === "present" ? null : "present"
}

export function nextAttendanceFromDoubleClick(current) {
  return current === "absent" ? null : "absent"
}

export function removePlantOperatorRegistersForProject(projectId) {
  if (typeof window === "undefined") return

  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllPlantOperatorRegisters() {
  if (typeof window === "undefined") return
  removeGroveItem(PLANT_OPERATOR_REGISTER_STORAGE_KEY)
}
