import { enrichRateAnalysisWithActivity } from "@/lib/rateAnalysisActivities"
import {
  DAILY_SLOT_TEMPLATES,
  getMissingSlotTemplates,
  sortSlots,
} from "@/lib/dailySlots"
import { getDayIdsInMonth, getDayIdsInWeek } from "@/lib/projectData"
import { formatCurrency } from "@/lib/formatCurrency"
import {
  calculateDailyRate,
  calculateFuelCost,
  formatDailyRate,
  parsePlantCostAmount,
} from "@/lib/plantCostCalculations"
import {
  getDailyFile,
  getDailyFiles,
  getMonthlyFile,
  getMonthlyFiles,
  getWeeklyFile,
  getWeeklyFiles,
} from "@/lib/projects"
import { isTodayDayId } from "@/lib/dailyFiles"

export {
  calculateDailyRate,
  calculateFuelCost,
  formatDailyRate,
  parsePlantCostAmount,
} from "@/lib/plantCostCalculations"

export const PLANT_COST_STORAGE_KEY = "grove-plant-cost"
const LEGACY_FUEL_COST_STORAGE_KEY = "grove-fuel-cost"

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw =
      window.localStorage.getItem(PLANT_COST_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_FUEL_COST_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PLANT_COST_STORAGE_KEY, JSON.stringify(store))
}

function calculateLegacyPlantHireCost(workedHours, hireRate) {
  const hours = parsePlantCostAmount(workedHours)
  const rate = parsePlantCostAmount(hireRate)

  if (hours === null || rate === null) {
    return null
  }

  return Math.round(hours * rate * 100) / 100
}

export function calculateDailyPlantCost(fuelCost, plantHireCost) {
  if (fuelCost === null && plantHireCost === null) {
    return null
  }

  return Math.round(((fuelCost ?? 0) + (plantHireCost ?? 0)) * 100) / 100
}

/** @deprecated Use calculateDailyPlantCost */
export function calculateTotalPlantCost(fuelCost, plantHireCost) {
  return calculateDailyPlantCost(fuelCost, plantHireCost)
}

export function formatPlantCost(value) {
  if (value === null || value === undefined) return "—"
  return formatCurrency(value)
}

export function createEmptyPlantCostRow(projectId, dayId) {
  const dailyFile = getDailyFile(projectId, dayId)

  return {
    id: crypto.randomUUID(),
    date: dailyFile?.date ?? dayId,
    fuelAllocated: "",
    fuelPrice: "",
    equipmentName: "",
    plantHireCost: "",
    production: "",
  }
}

export function createPlantCostSlotFromTemplate(template) {
  return {
    id: template.id,
    startTime: template.startTime,
    endTime: template.endTime,
    label: "Hourly dashboard",
    order: template.order,
    rows: [],
  }
}

function migratePlantCostRow(row) {
  if (row.plantHireCost !== "" && row.plantHireCost !== undefined && row.plantHireCost !== null) {
    return row
  }

  const legacyHireCost = calculateLegacyPlantHireCost(row.workedHours, row.hireRate)
  if (legacyHireCost === null) {
    return row
  }

  return {
    ...row,
    plantHireCost: String(legacyHireCost),
  }
}

function normalizeSlot(slot, projectId, dayId) {
  const template = DAILY_SLOT_TEMPLATES.find((item) => item.id === slot.id)

  return {
    ...createPlantCostSlotFromTemplate(template ?? DAILY_SLOT_TEMPLATES[0]),
    ...slot,
    rows: (slot.rows ?? []).map((row) => migratePlantCostRow({
      ...createEmptyPlantCostRow(projectId, dayId),
      ...row,
    })),
  }
}

function migrateLegacyDayEntry(projectId, dayId, existing) {
  if (existing?.slots?.length) {
    return {
      dayId,
      slots: existing.slots.map((slot) => normalizeSlot(slot, projectId, dayId)),
      updatedAt: existing.updatedAt ?? new Date().toISOString(),
    }
  }

  if (existing?.rows?.length) {
    const template = DAILY_SLOT_TEMPLATES[0]
    return {
      dayId,
      slots: [
        {
          ...createPlantCostSlotFromTemplate(template),
          rows: existing.rows.map((row) => migratePlantCostRow({
            ...createEmptyPlantCostRow(projectId, dayId),
            ...row,
          })),
        },
      ],
      updatedAt: existing.updatedAt ?? new Date().toISOString(),
    }
  }

  return {
    dayId,
    slots: [],
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
  }
}

function createEmptyDayEntry(dayId) {
  return {
    dayId,
    slots: [],
    updatedAt: new Date().toISOString(),
  }
}

export function getPlantCostDayEntry(projectId, dayId) {
  if (typeof window === "undefined") {
    return createEmptyDayEntry(dayId)
  }

  const store = readStore()
  const projectEntries = store[projectId] ?? {}
  const existing = projectEntries[dayId]

  if (!existing) {
    return createEmptyDayEntry(dayId)
  }

  return migrateLegacyDayEntry(projectId, dayId, existing)
}

export function getPlantCostSlotsForDay(projectId, dayId) {
  return sortSlots(getPlantCostDayEntry(projectId, dayId).slots)
}

export function savePlantCostSlotsForDay(projectId, dayId, slots) {
  const store = readStore()
  const projectEntries = store[projectId] ?? {}

  projectEntries[dayId] = {
    dayId,
    slots: sortSlots(slots),
    updatedAt: new Date().toISOString(),
  }

  store[projectId] = projectEntries
  writeStore(store)
}

export function getMissingPlantCostSlotTemplates(activeSlots) {
  return getMissingSlotTemplates(activeSlots)
}

export function dayHasPlantCostHourlyData(projectId, dayId) {
  const entry = getPlantCostDayEntry(projectId, dayId)
  return entry.slots.length > 0
}

function rowHasContent(row) {
  return Boolean(
    row.date?.trim() ||
      row.fuelAllocated !== "" ||
      row.fuelPrice !== "" ||
      row.equipmentName?.trim() ||
      row.plantHireCost !== "" ||
      row.workedHours !== "" ||
      row.hireRate !== "" ||
      row.production !== ""
  )
}

function resolvePlantHireCost(row) {
  const direct = parsePlantCostAmount(row.plantHireCost)
  if (direct !== null) {
    return direct
  }

  return calculateLegacyPlantHireCost(row.workedHours, row.hireRate)
}

function mapPlantCostRow(row, dayId, slotId) {
  const fuelCost = calculateFuelCost(row.fuelAllocated, row.fuelPrice)
  const plantHireCost = resolvePlantHireCost(row)
  const dailyPlantCost = calculateDailyPlantCost(fuelCost, plantHireCost)

  return {
    id: row.id,
    dayId,
    slotId,
    date: row.date,
    fuelAllocated: parsePlantCostAmount(row.fuelAllocated),
    fuelPrice: parsePlantCostAmount(row.fuelPrice),
    fuelCost,
    equipmentName: row.equipmentName?.trim() || "",
    plantHireCost,
    dailyPlantCost,
    production: parsePlantCostAmount(row.production),
  }
}

function getRowsForDay(projectId, dayId) {
  const rows = []

  for (const slot of getPlantCostSlotsForDay(projectId, dayId)) {
    for (const row of slot.rows) {
      if (!rowHasContent(row)) continue
      rows.push(mapPlantCostRow(row, dayId, slot.id))
    }
  }

  return rows
}

function rowQualifiesForRateAnalysis(mappedRow) {
  return Boolean((mappedRow.dailyPlantCost ?? 0) > 0 || (mappedRow.production ?? 0) > 0)
}

function buildRateAnalysisSummary(currentDate, mappedRows, { groupByPlant = true } = {}) {
  const qualifyingRows = mappedRows.filter(rowQualifiesForRateAnalysis)

  if (!groupByPlant) {
    const rows = qualifyingRows
      .map((row) => ({
        id: row.id,
        plantName: row.equipmentName || "Unnamed plant",
        currentDate,
        dailyPlantCost: row.dailyPlantCost ?? 0,
        production: row.production ?? 0,
        dailyRate: calculateDailyRate(row.dailyPlantCost, row.production),
      }))
      .sort((left, right) => left.plantName.localeCompare(right.plantName))

    const totals = rows.reduce(
      (summary, row) => ({
        dailyPlantCost:
          Math.round((summary.dailyPlantCost + row.dailyPlantCost) * 100) / 100,
        production: Math.round((summary.production + row.production) * 100) / 100,
      }),
      { dailyPlantCost: 0, production: 0 }
    )

    return {
      currentDate,
      rows,
      totals: {
        ...totals,
        dailyRate: calculateDailyRate(totals.dailyPlantCost, totals.production),
      },
    }
  }

  const rowsByPlant = new Map()

  for (const row of qualifyingRows) {
    const plantName = row.equipmentName || "Unnamed plant"
    const existing = rowsByPlant.get(plantName) ?? {
      plantName,
      currentDate,
      dailyPlantCost: 0,
      production: 0,
    }

    existing.dailyPlantCost =
      Math.round((existing.dailyPlantCost + (row.dailyPlantCost ?? 0)) * 100) / 100
    existing.production =
      Math.round((existing.production + (row.production ?? 0)) * 100) / 100

    rowsByPlant.set(plantName, existing)
  }

  const rows = [...rowsByPlant.values()]
    .map((row) => ({
      ...row,
      dailyRate: calculateDailyRate(row.dailyPlantCost, row.production),
    }))
    .sort((left, right) => left.plantName.localeCompare(right.plantName))

  const totals = rows.reduce(
    (summary, row) => ({
      dailyPlantCost:
        Math.round((summary.dailyPlantCost + row.dailyPlantCost) * 100) / 100,
      production: Math.round((summary.production + row.production) * 100) / 100,
    }),
    { dailyPlantCost: 0, production: 0 }
  )

  return {
    currentDate,
    rows,
    totals: {
      ...totals,
      dailyRate: calculateDailyRate(totals.dailyPlantCost, totals.production),
    },
  }
}

export function getPlantRateAnalysisSummary(projectId, dayId) {
  const dailyFile = getDailyFile(projectId, dayId)
  const currentDate = dailyFile?.date ?? dayId
  const mappedRows = getRowsForDay(projectId, dayId)
  const analysis = buildRateAnalysisSummary(currentDate, mappedRows, { groupByPlant: true })
  const enriched = enrichRateAnalysisWithActivity(projectId, [dayId], analysis)

  return {
    dayId,
    ...enriched,
    slotCount: getPlantCostSlotsForDay(projectId, dayId).length,
  }
}

export function getPlantRateAnalysisSummaryForSlot(projectId, dayId, slotId) {
  const dailyFile = getDailyFile(projectId, dayId)
  const currentDate = dailyFile?.date ?? dayId
  const slot = getPlantCostSlotsForDay(projectId, dayId).find((item) => item.id === slotId)
  const mappedRows = (slot?.rows ?? [])
    .filter(rowHasContent)
    .map((row) => mapPlantCostRow(row, dayId, slotId))

  return {
    dayId,
    slotId,
    ...enrichRateAnalysisWithActivity(projectId, [dayId], buildRateAnalysisSummary(currentDate, mappedRows, { groupByPlant: false })),
  }
}

function getPeriodLabel(projectId, period, fileId) {
  if (period === "project-to-date") {
    return "Project to date"
  }
  if (period === "weekly") {
    return getWeeklyFile(projectId, fileId)?.label ?? fileId
  }
  if (period === "monthly") {
    return getMonthlyFile(projectId, fileId)?.label ?? fileId
  }
  const dailyFile = getDailyFile(projectId, fileId)
  return dailyFile?.date ?? fileId
}

export function getPlantRateAnalysisPeriodSummary(projectId, period, fileId) {
  const dayIds =
    period === "project-to-date"
      ? getDailyFiles(projectId).map((file) => file.id)
      : getDayIdsForPeriod(projectId, period, fileId)

  const mappedRows = []
  for (const dayId of dayIds) {
    mappedRows.push(...getRowsForDay(projectId, dayId))
  }

  const currentDate = getPeriodLabel(projectId, period, fileId)
  const analysis = buildRateAnalysisSummary(currentDate, mappedRows, { groupByPlant: true })
  const enriched = enrichRateAnalysisWithActivity(projectId, dayIds, analysis)

  return {
    period,
    fileId,
    dayIds,
    daysWithEntries: dayIds.filter((dayId) => getRowsForDay(projectId, dayId).length > 0)
      .length,
    slotCount: dayIds.reduce(
      (count, dayId) => count + getPlantCostSlotsForDay(projectId, dayId).length,
      0
    ),
    ...enriched,
  }
}

export function savePlantCostSlotRows(projectId, dayId, slotId, rows) {
  const entry = getPlantCostDayEntry(projectId, dayId)
  const nextSlots = entry.slots.map((slot) =>
    slot.id === slotId ? { ...slot, rows } : slot
  )

  if (!nextSlots.some((slot) => slot.id === slotId)) {
    return false
  }

  savePlantCostSlotsForDay(projectId, dayId, nextSlots)
  return true
}

export function getPlantCostSlotRows(projectId, dayId, slotId) {
  const slot = getPlantCostSlotsForDay(projectId, dayId).find((item) => item.id === slotId)
  return slot?.rows ?? []
}

export function getPlantCostDailyFileStatus(projectId, file) {
  const hasSlots = dayHasPlantCostHourlyData(projectId, file.id)
  const hasRowData = getRowsForDay(projectId, file.id).length > 0
  const isToday = isTodayDayId(file.id)

  if (isToday && !hasSlots) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for hourly dashboards and plant cost entry",
    }
  }

  if (isToday && hasSlots && !hasRowData) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Hourly dashboards added — open plant cost material schedule in each slot",
    }
  }

  if (isToday && hasRowData) {
    return {
      key: "in-progress",
      label: "In progress",
      description: "Plant cost data in progress for today",
    }
  }

  if (hasRowData) {
    return {
      key: "completed",
      label: "Completed",
      description: `Completed ${file.completedAt}`,
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "No hourly plant cost data saved for this day",
  }
}

function getDayIdsForPeriod(projectId, period, fileId) {
  if (period === "weekly") return getDayIdsInWeek(projectId, fileId)
  if (period === "monthly") return getDayIdsInMonth(projectId, fileId)
  return [fileId]
}

export function getPlantCostPeriodSummary(projectId, period, fileId) {
  const dayIds = getDayIdsForPeriod(projectId, period, fileId)
  const rows = []

  for (const dayId of dayIds) {
    rows.push(...getRowsForDay(projectId, dayId))
  }

  const totalFuelAllocated =
    Math.round(
      rows.reduce((sum, row) => sum + (row.fuelAllocated ?? 0), 0) * 100
    ) / 100
  const totalProduction =
    Math.round(rows.reduce((sum, row) => sum + (row.production ?? 0), 0) * 100) / 100
  const totalFuelCost =
    Math.round(rows.reduce((sum, row) => sum + (row.fuelCost ?? 0), 0) * 100) / 100
  const totalPlantHireCost =
    Math.round(rows.reduce((sum, row) => sum + (row.plantHireCost ?? 0), 0) * 100) / 100
  const totalDailyPlantCost =
    Math.round(rows.reduce((sum, row) => sum + (row.dailyPlantCost ?? 0), 0) * 100) / 100

  return {
    period,
    fileId,
    dayIds,
    rows,
    totalFuelAllocated,
    totalProduction,
    totalFuelCost,
    totalPlantHireCost,
    totalDailyPlantCost,
    totalPlantCost: totalDailyPlantCost,
    daysWithEntries: dayIds.filter((dayId) => getRowsForDay(projectId, dayId).length > 0)
      .length,
  }
}

export function getPlantCostDetailDescription(period) {
  if (period === "daily") {
    return "Daily rates roll up from hourly dashboards. Add hourly dashboards, save plant cost material schedules in each slot, and the daily rate is calculated automatically."
  }

  if (period === "weekly") {
    return "Weekly rates roll up automatically from daily hourly plant cost material schedules for this project week."
  }

  if (period === "project-to-date") {
    return "Project to date rates roll up automatically from all daily hourly plant cost material schedules from project start."
  }

  return "Monthly rates roll up automatically from daily hourly plant cost material schedules for this calendar month."
}

export function removePlantCostForProject(projectId) {
  if (typeof window === "undefined") return

  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllPlantCosts() {
  if (typeof window === "undefined") return

  window.localStorage.removeItem(PLANT_COST_STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_FUEL_COST_STORAGE_KEY)
}
