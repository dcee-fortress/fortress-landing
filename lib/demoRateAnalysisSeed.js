import { SITE_ACTIVITIES } from "@/lib/activities"
import { addProjectBoq, getProjectBoqs } from "@/lib/boqData"
import { parseDayId, startOfDay } from "@/lib/dailyFiles"
import { buildDemoSlotsForDay } from "@/lib/demoHourlySeed"
import { shouldUseDemoValues } from "@/lib/demoMode"
import {
  ACTUAL_COST_SCHEDULE_TYPE,
  getMaterialScheduleRows,
  hasScheduleTypeData,
  purgeTargetCostMaterialSchedules,
  saveMaterialScheduleRows,
} from "@/lib/materialSchedule"
import { getProjectStartDate, getProjectStoreDayIds } from "@/lib/periodFiles"
import { getSlotsForDay, writeProjectDaySlots } from "@/lib/projectData"
import { getDailyFile, getDailyFiles } from "@/lib/projects"
import { SEEDED_PROJECT_ID } from "@/lib/projectRegistry"
import { sortSlots } from "@/lib/dailySlots"

export const DEMO_BOQ_NAME = "Roads Contract BOQ"
export const ACTUAL_COST_SCHEDULE_TYPE_EXPORT = ACTUAL_COST_SCHEDULE_TYPE

const DEMO_BOQ_ITEMS = [
  {
    id: "boq-demo-reduced-levels",
    itemName: "Reduced Levels",
    rate: 12.5,
    unit: "m³",
  },
  {
    id: "boq-demo-structural-steel",
    itemName: "Structural Steel Erection",
    rate: 18.75,
    unit: "ton",
  },
  {
    id: "boq-demo-concrete-slabs",
    itemName: "Concrete Slab Pours",
    rate: 22.4,
    unit: "m³",
  },
  {
    id: "boq-demo-precast-panels",
    itemName: "Precast Panel Lifts",
    rate: 15.8,
    unit: "no.",
  },
]

const DEMO_ACTIVITY_UNITS = ["m³", "ton", "m³", "no."]

const DEMO_ACTIVITY_ROWS = [
  {
    description: "Reduced Levels",
    boqRate: 12.5,
    plantName: "EX-01 20t Excavator",
    rateVariance: 0.08,
  },
  {
    description: "Structural Steel Erection",
    boqRate: 18.75,
    plantName: "CR-01 Crawler Crane",
    rateVariance: -0.05,
  },
  {
    description: "Concrete Slab Pours",
    boqRate: 22.4,
    plantName: "CP-02 Concrete Pump",
    rateVariance: 0.06,
  },
  {
    description: "Precast Panel Lifts",
    boqRate: 15.8,
    plantName: "TL-03 Telehandler",
    rateVariance: -0.03,
  },
]

function getDayNumber(dayId, projectId) {
  const projectStart = startOfDay(getProjectStartDate(projectId))
  const day = startOfDay(parseDayId(dayId))
  return Math.max(1, Math.floor((day - projectStart) / (1000 * 60 * 60 * 24)) + 1)
}

function formatRowDate(dayId) {
  const date = parseDayId(dayId)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function buildCostSplit(totalCost) {
  const plantHire = Math.round(totalCost * 0.55)
  const laborCost = Math.round(totalCost * 0.35)
  const fuelSpend = Math.max(0, Math.round((totalCost - plantHire - laborCost) * 100) / 100)

  return { plantHire, laborCost, fuelSpend }
}

function buildDemoMaterialRows(dayId, projectId) {
  const dayNumber = getDayNumber(dayId, projectId)
  const dateLabel = formatRowDate(dayId)

  return DEMO_ACTIVITY_ROWS.map((activity, index) => {
    const production = 10 + ((dayNumber + index) % 6) * 2
    const rateMultiplier = 1 + activity.rateVariance * Math.sin(dayNumber / 9)
    const rate = Math.round(activity.boqRate * rateMultiplier * 100) / 100
    const totalCost = Math.round(rate * production * 100) / 100
    const { plantHire, laborCost, fuelSpend } = buildCostSplit(totalCost)
    const fuelAllocated = 30 + ((dayNumber + index) % 8)
    const fuelPrice = fuelSpend > 0 ? Math.round((fuelSpend / fuelAllocated) * 100) / 100 : 1.85

    return {
      id: `demo-mat-${ACTUAL_COST_SCHEDULE_TYPE}-${dayId}-${index}`,
      date: dateLabel,
      activityDescription: activity.description,
      plantName: activity.plantName,
      fuelAllocated: String(fuelAllocated),
      fuelPrice: String(fuelPrice),
      plantHire: String(plantHire),
      laborCost: String(laborCost),
      production: String(production),
      unit: DEMO_ACTIVITY_UNITS[index] ?? "",
    }
  })
}

function needsDemoMaterialScheduleSeed(projectId, dayId, slotId) {
  if (!hasScheduleTypeData(projectId, dayId, slotId, ACTUAL_COST_SCHEDULE_TYPE)) {
    return true
  }

  const demoDescriptions = new Set(
    DEMO_ACTIVITY_ROWS.map((activity) => activity.description.trim().toLowerCase())
  )

  return !getMaterialScheduleRows(projectId, dayId, slotId, ACTUAL_COST_SCHEDULE_TYPE).some(
    (row) =>
      demoDescriptions.has(row.activityDescription.trim().toLowerCase()) &&
      ((row.totalCost ?? 0) > 0 || (row.resolvedProduction ?? 0) > 0)
  )
}

function ensureDemoSlotsForDay(projectId, dayId) {
  if (getProjectStoreDayIds(projectId).includes(dayId)) {
    return
  }

  const dailyFile = getDailyFile(projectId, dayId)
  if (!dailyFile) return

  writeProjectDaySlots(projectId, dayId, sortSlots(buildDemoSlotsForDay(dailyFile)))
}

function getPrimarySlotId(projectId, dayId) {
  const slots = getSlotsForDay(projectId, dayId)
  return slots[0]?.id ?? null
}

export function ensureDemoBoq(projectId = SEEDED_PROJECT_ID) {
  if (typeof window === "undefined") return
  if (!shouldUseDemoValues(projectId)) return

  const existing = getProjectBoqs(projectId)
  if (existing.some((boq) => boq.demo || boq.name === DEMO_BOQ_NAME)) return

  addProjectBoq(projectId, {
    name: DEMO_BOQ_NAME,
    fileName: "roads-contract-boq-demo.csv",
    items: DEMO_BOQ_ITEMS,
    demo: true,
  })
}

export function ensureDemoMaterialSchedules(projectId = SEEDED_PROJECT_ID) {
  if (typeof window === "undefined") return
  if (!shouldUseDemoValues(projectId)) return

  purgeTargetCostMaterialSchedules()
  ensureDemoBoq(projectId)

  for (const file of getDailyFiles(projectId)) {
    ensureDemoSlotsForDay(projectId, file.id)
    const slotId = getPrimarySlotId(projectId, file.id)
    if (!slotId) continue

    if (!needsDemoMaterialScheduleSeed(projectId, file.id, slotId)) {
      continue
    }

    saveMaterialScheduleRows(
      projectId,
      file.id,
      slotId,
      ACTUAL_COST_SCHEDULE_TYPE,
      buildDemoMaterialRows(file.id, projectId)
    )

    const syncedSlots = getSlotsForDay(projectId, file.id)
    writeProjectDaySlots(projectId, file.id, sortSlots(syncedSlots))
  }
}

export function ensureDemoRateAnalysisData(projectId = SEEDED_PROJECT_ID) {
  if (typeof window === "undefined") return
  if (!shouldUseDemoValues(projectId)) return

  ensureDemoMaterialSchedules(projectId)
}
