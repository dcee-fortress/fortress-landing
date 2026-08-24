import { getDayIdsInMonth, getDayIdsInWeek } from "@/lib/projectData"
import { getDailyFiles } from "@/lib/projects"

export const PLANT_HOURS_STORAGE_KEY = "grove-plant-hours"

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(PLANT_HOURS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function hasStoredPlantHoursEntry(projectId, dayId) {
  if (typeof window === "undefined") return false

  const projectEntries = readStore()[projectId] ?? {}
  return Boolean(projectEntries[dayId] ?? projectEntries[`daily:${dayId}`])
}

function writeStore(store) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PLANT_HOURS_STORAGE_KEY, JSON.stringify(store))
}

export function createEmptyPlantHoursRow() {
  return {
    id: crypto.randomUUID(),
    plantNumber: "",
    plantDescription: "",
    startHours: "",
    finishHours: "",
  }
}

export function parseHoursValue(value) {
  if (value === null || value === undefined || value === "") return null

  const asString = String(value).trim()
  if (!asString) return null

  if (asString.includes(":")) {
    const [hoursPart, minutesPart = "0"] = asString.split(":")
    const hours = Number(hoursPart)
    const minutes = Number(minutesPart)

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

    return Math.round((hours + minutes / 60) * 100) / 100
  }

  const parsed = Number(asString.replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeHourField(value) {
  if (value === null || value === undefined || value === "") return ""

  if (typeof value === "number") {
    return String(value)
  }

  return String(value).trim()
}

function normalizePlantHoursRow(row) {
  const legacyStart = row.startHours ?? row.startTime ?? ""
  const legacyFinish = row.finishHours ?? row.finishTime ?? ""

  return {
    ...createEmptyPlantHoursRow(),
    ...row,
    startHours: normalizeHourField(legacyStart),
    finishHours: normalizeHourField(legacyFinish),
  }
}

export function calculateOperatingHours(startHours, finishHours) {
  const start = parseHoursValue(startHours)
  const finish = parseHoursValue(finishHours)

  if (start === null || finish === null) {
    return null
  }

  const diff = Math.round((finish - start) * 100) / 100
  return diff >= 0 ? diff : null
}

export function formatOperatingHours(hours) {
  if (hours === null || hours === undefined) return "—"
  const rounded = Math.round(hours * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function createEmptyDailyEntry(dayId) {
  return {
    dayId,
    rows: [],
    updatedAt: new Date().toISOString(),
  }
}

function normalizeDailyEntry(dayId, existing) {
  return {
    ...createEmptyDailyEntry(dayId),
    ...existing,
    dayId,
    rows: (existing?.rows ?? []).map((row) => normalizePlantHoursRow(row)),
  }
}

/** Daily plant hours are the only editable source of truth. */
export function getDailyPlantHoursData(projectId, dayId) {
  if (typeof window === "undefined") {
    return createEmptyDailyEntry(dayId)
  }

  const store = readStore()
  const projectEntries = store[projectId] ?? {}
  const legacyKey = `daily:${dayId}`
  const existing = projectEntries[dayId] ?? projectEntries[legacyKey]

  if (!existing) {
    return createEmptyDailyEntry(dayId)
  }

  return normalizeDailyEntry(dayId, existing)
}

export function saveDailyPlantHoursData(projectId, dayId, entry) {
  const store = readStore()
  const projectEntries = store[projectId] ?? {}

  projectEntries[dayId] = {
    ...entry,
    dayId,
    rows: (entry.rows ?? []).map((row) => ({
      id: row.id,
      plantNumber: row.plantNumber ?? "",
      plantDescription: row.plantDescription ?? "",
      startHours: row.startHours ?? "",
      finishHours: row.finishHours ?? "",
    })),
    updatedAt: new Date().toISOString(),
  }

  delete projectEntries[`daily:${dayId}`]

  store[projectId] = projectEntries
  writeStore(store)
}

function rowHasContent(row) {
  return Boolean(
    row.plantNumber?.trim() ||
      row.plantDescription?.trim() ||
      row.startHours ||
      row.finishHours ||
      row.startTime ||
      row.finishTime
  )
}

function plantGroupKey(plantNumber, plantDescription) {
  return `${plantNumber.trim().toLowerCase()}::${plantDescription.trim().toLowerCase()}`
}

function getDayIdsForPeriod(projectId, period, fileId) {
  if (period === "weekly") return getDayIdsInWeek(projectId, fileId)
  if (period === "monthly") return getDayIdsInMonth(projectId, fileId)
  return [fileId]
}

export function aggregatePlantHoursByPlant(projectId, dayIds) {
  const grouped = new Map()

  for (const dayId of dayIds) {
    const dailyEntry = getDailyPlantHoursData(projectId, dayId)

    for (const row of dailyEntry.rows) {
      if (!rowHasContent(row)) continue

      const hours = calculateOperatingHours(row.startHours, row.finishHours) ?? 0
      const key = plantGroupKey(row.plantNumber, row.plantDescription)
      const existing = grouped.get(key) ?? {
        plantNumber: row.plantNumber,
        plantDescription: row.plantDescription,
        hoursOperating: 0,
        daysRecorded: 0,
      }

      existing.hoursOperating = Math.round((existing.hoursOperating + hours) * 100) / 100
      if (hours > 0 || row.startHours || row.finishHours) {
        existing.daysRecorded += 1
      }

      grouped.set(key, existing)
    }
  }

  return [...grouped.values()].sort((left, right) => {
    const numberCompare = left.plantNumber.localeCompare(right.plantNumber)
    if (numberCompare !== 0) return numberCompare
    return left.plantDescription.localeCompare(right.plantDescription)
  })
}

export function sumPlantHoursRows(rows) {
  const total = rows.reduce((sum, row) => {
    if (!rowHasContent(row)) return sum
    return sum + (calculateOperatingHours(row.startHours, row.finishHours) ?? 0)
  }, 0)

  return Math.round(total * 100) / 100
}

export function getDailyPlantHoursTotal(projectId, dayId) {
  return sumPlantHoursRows(getDailyPlantHoursData(projectId, dayId).rows)
}

export function getPlantHoursProjectToDateSummary(projectId) {
  const dayIds = getDailyFiles(projectId).map((file) => file.id)
  const rows = aggregatePlantHoursByPlant(projectId, dayIds)
  const totalHours = Math.round(rows.reduce((sum, row) => sum + row.hoursOperating, 0) * 100) / 100

  return {
    period: "project-to-date",
    dayIds,
    rows,
    totalHours,
    daysWithEntries: dayIds.filter((dayId) =>
      getDailyPlantHoursData(projectId, dayId).rows.some(rowHasContent)
    ).length,
  }
}

export function getPlantHoursPeriodSummary(projectId, period, fileId) {
  const dayIds = getDayIdsForPeriod(projectId, period, fileId)
  const rows = aggregatePlantHoursByPlant(projectId, dayIds)
  const totalHours = Math.round(rows.reduce((sum, row) => sum + row.hoursOperating, 0) * 100) / 100

  return {
    period,
    fileId,
    dayIds,
    rows,
    totalHours,
    daysWithEntries: dayIds.filter((dayId) =>
      getDailyPlantHoursData(projectId, dayId).rows.some(rowHasContent)
    ).length,
  }
}

export function getPlantHoursDetailDescription(period) {
  if (period === "daily") {
    return "Enter start hours and finish hours as figures for each item. Hours operating = finish hours − start hours, calculated automatically."
  }

  if (period === "weekly") {
    return "Weekly totals are calculated automatically from daily plant hours entries for each day in this project week."
  }

  return "Monthly totals are calculated automatically from daily plant hours entries for each day in this calendar month."
}

export function clearPlantHoursForProject(projectId) {
  if (typeof window === "undefined") return

  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllPlantHours() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(PLANT_HOURS_STORAGE_KEY)
}
