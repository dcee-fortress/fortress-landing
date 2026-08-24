import { getDayIdsInMonth, getDayIdsInWeek } from "@/lib/projectData"
import { getDailyFiles } from "@/lib/projects"
import {
  calculateOperatingHours,
  formatOperatingHours,
  parseHoursValue,
} from "@/lib/plantHoursData"

export const EQUIPMENT_HOURS_STORAGE_KEY = "grove-equipment-hours"

export { calculateOperatingHours, formatOperatingHours }

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(EQUIPMENT_HOURS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(EQUIPMENT_HOURS_STORAGE_KEY, JSON.stringify(store))
}

function createEmptyDayEntry(dayId) {
  return {
    dayId,
    entries: {},
    updatedAt: new Date().toISOString(),
  }
}

function normalizeHourField(value) {
  if (value === null || value === undefined || value === "") return ""
  if (typeof value === "number") return String(value)
  return String(value).trim()
}

function normalizeEquipmentHoursEntry(entry = {}) {
  return {
    startHours: normalizeHourField(entry.startHours),
    finishHours: normalizeHourField(entry.finishHours),
    hoursOperating: normalizeHourField(entry.hoursOperating),
    hoursOperatingEdited: Boolean(entry.hoursOperatingEdited),
    plant: String(entry.plant ?? "").trim(),
    plantEdited: Boolean(entry.plantEdited),
  }
}

export function resolveEquipmentOperatingHours(entry = {}) {
  const normalized = normalizeEquipmentHoursEntry(entry)

  if (normalized.hoursOperatingEdited) {
    return parseHoursValue(normalized.hoursOperating)
  }

  const calculated = calculateOperatingHours(normalized.startHours, normalized.finishHours)
  if (calculated !== null) {
    return calculated
  }

  return parseHoursValue(normalized.hoursOperating)
}

export function getEquipmentOperatingHoursInputValue(entry = {}) {
  const normalized = normalizeEquipmentHoursEntry(entry)

  if (normalized.hoursOperatingEdited) {
    return normalized.hoursOperating
  }

  const calculated = calculateOperatingHours(normalized.startHours, normalized.finishHours)
  if (calculated !== null) {
    return formatOperatingHours(calculated) === "—" ? "" : formatOperatingHours(calculated)
  }

  return normalized.hoursOperating
}

export function getDailyEquipmentHoursData(projectId, dayId) {
  if (typeof window === "undefined") {
    return createEmptyDayEntry(dayId)
  }

  const store = readStore()
  const projectEntries = store[projectId] ?? {}
  const existing = projectEntries[dayId] ?? createEmptyDayEntry(dayId)

  return {
    dayId,
    entries: existing.entries ?? {},
    updatedAt: existing.updatedAt ?? new Date().toISOString(),
  }
}

export function saveDailyEquipmentHoursData(projectId, dayId, entries) {
  const store = readStore()
  const projectEntries = store[projectId] ?? {}

  const normalizedEntries = Object.fromEntries(
    Object.entries(entries ?? {}).map(([equipmentId, entry]) => [
      equipmentId,
      normalizeEquipmentHoursEntry(entry),
    ])
  )

  projectEntries[dayId] = {
    dayId,
    entries: normalizedEntries,
    updatedAt: new Date().toISOString(),
  }

  store[projectId] = projectEntries
  writeStore(store)
}

export function getEquipmentHoursEntry(projectId, dayId, equipmentId) {
  const dayData = getDailyEquipmentHoursData(projectId, dayId)
  const entry = dayData.entries[equipmentId] ?? { startHours: "", finishHours: "" }

  return {
    startHours: normalizeHourField(entry.startHours),
    finishHours: normalizeHourField(entry.finishHours),
  }
}

export function saveEquipmentHoursEntry(projectId, dayId, equipmentId, { startHours, finishHours }) {
  const dayData = getDailyEquipmentHoursData(projectId, dayId)

  saveDailyEquipmentHoursData(projectId, dayId, {
    ...dayData.entries,
    [equipmentId]: {
      startHours: normalizeHourField(startHours),
      finishHours: normalizeHourField(finishHours),
    },
  })
}

export function enrichEquipmentWithHours(projectId, dayId, equipment) {
  const dayData = getDailyEquipmentHoursData(projectId, dayId)

  return equipment.map((item) => {
    const stored = normalizeEquipmentHoursEntry(dayData.entries[item.id])
    const hoursOperating = resolveEquipmentOperatingHours(stored)

    return {
      ...item,
      startHours: stored.startHours,
      finishHours: stored.finishHours,
      hoursOperating,
      hoursOperatingInput: getEquipmentOperatingHoursInputValue(stored),
      hoursOperatingEdited: stored.hoursOperatingEdited,
    }
  })
}

export function sumEquipmentHours(items) {
  const total = items.reduce((sum, item) => sum + (item.hoursOperating ?? 0), 0)
  return Math.round(total * 100) / 100
}

function dayHasEquipmentHours(projectId, dayId) {
  const dayData = getDailyEquipmentHoursData(projectId, dayId)

  return Object.values(dayData.entries).some((entry) => {
    const hours = resolveEquipmentOperatingHours(entry)
    return hours !== null && hours > 0
  })
}

function getDayIdsForPeriod(projectId, period, fileId) {
  if (period === "weekly") return getDayIdsInWeek(projectId, fileId)
  if (period === "monthly") return getDayIdsInMonth(projectId, fileId)
  return [fileId]
}

export function getEquipmentHoursProjectToDateSummary(projectId) {
  const dayIds = getDailyFiles(projectId).map((file) => file.id)
  let totalHours = 0
  let daysWithEntries = 0

  for (const dayId of dayIds) {
    if (!dayHasEquipmentHours(projectId, dayId)) continue
    daysWithEntries += 1

    const dayData = getDailyEquipmentHoursData(projectId, dayId)
    for (const entry of Object.values(dayData.entries)) {
      totalHours += resolveEquipmentOperatingHours(entry) ?? 0
    }
  }

  return {
    period: "project-to-date",
    dayIds,
    totalHours: Math.round(totalHours * 100) / 100,
    daysWithEntries,
  }
}

export function getEquipmentHoursPeriodSummary(projectId, period, fileId) {
  const dayIds = getDayIdsForPeriod(projectId, period, fileId)
  let totalHours = 0
  let daysWithEntries = 0

  for (const dayId of dayIds) {
    if (!dayHasEquipmentHours(projectId, dayId)) continue
    daysWithEntries += 1

    const dayData = getDailyEquipmentHoursData(projectId, dayId)
    for (const entry of Object.values(dayData.entries)) {
      totalHours += resolveEquipmentOperatingHours(entry) ?? 0
    }
  }

  return {
    period,
    fileId,
    dayIds,
    totalHours: Math.round(totalHours * 100) / 100,
    daysWithEntries,
  }
}

export function getEquipmentHoursDetailDescription(period) {
  if (period === "daily") {
    return "Equipment is listed from register ticks marked present. Plant names link from material schedule entries for the same day (editable here). Enter start and finish hours, or type hours operating directly."
  }

  if (period === "weekly") {
    return "Weekly equipment hours roll up automatically from daily start and finish hour entries across this project week."
  }

  return "Monthly equipment hours roll up automatically from daily start and finish hour entries across this calendar month."
}

export function removeEquipmentHoursForProject(projectId) {
  if (typeof window === "undefined") return

  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllEquipmentHours() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(EQUIPMENT_HOURS_STORAGE_KEY)
}
