import { addProjectBoq, getProjectBoqs } from "@/lib/boqData"
import { parseDayId, startOfDay } from "@/lib/dailyFiles"
import { DAILY_SLOT_TEMPLATES, sortSlots } from "@/lib/dailySlots"
import { ensureDemoPlantOnSiteData } from "@/lib/demoPlantOnSiteSeed"
import { shouldSeedLocalDevValuations, shouldUseDemoValues } from "@/lib/demoMode"
import {
  ACTUAL_COST_SCHEDULE_TYPE,
  hasScheduleTypeData,
  purgeTargetCostMaterialSchedules,
  saveMaterialScheduleRows,
} from "@/lib/materialSchedule"
import { getProjectStartDate } from "@/lib/periodFiles"
import {
  buildBlankSlotWithActivities,
  getSlotsForDay,
  writeProjectDaySlots,
} from "@/lib/projectData"
import { getDailyFile, getDailyFiles } from "@/lib/projects"
import {
  getCustomProjects,
  PROJECT_STATUS,
  SEEDED_PROJECT_ID,
} from "@/lib/projectRegistry"

const LOCAL_DEV_HOURLY_SLOT_COUNT = 2

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

function buildDemoMaterialRows(dayId, projectId, slotIndex = 0) {
  const dayNumber = getDayNumber(dayId, projectId)
  const dateLabel = formatRowDate(dayId)
  const activities = DEMO_ACTIVITY_ROWS.filter((_, index) => index % LOCAL_DEV_HOURLY_SLOT_COUNT === slotIndex)
  const unitOffset = slotIndex

  return activities.map((activity, index) => {
    const sourceIndex = unitOffset + index * LOCAL_DEV_HOURLY_SLOT_COUNT
    const production = 12 + ((dayNumber + sourceIndex) % 7) * 3
    const rateMultiplier = 1 + activity.rateVariance * Math.sin(dayNumber / 9)
    const rate = Math.round(activity.boqRate * rateMultiplier * 100) / 100
    const totalCost = Math.round(rate * production * 100) / 100
    const { plantHire, laborCost, fuelSpend } = buildCostSplit(totalCost)
    const fuelAllocated = 28 + ((dayNumber + sourceIndex) % 10)
    const fuelPrice = fuelSpend > 0 ? Math.round((fuelSpend / fuelAllocated) * 100) / 100 : 1.85

    return {
      id: `demo-mat-${ACTUAL_COST_SCHEDULE_TYPE}-${dayId}-${slotIndex}-${index}`,
      date: dateLabel,
      activityDescription: activity.description,
      details: "Local dev sample — not written to the live site",
      plantName: activity.plantName,
      fuelAllocated: String(fuelAllocated),
      fuelPrice: String(fuelPrice),
      plantHire: String(plantHire),
      laborCost: String(laborCost),
      production: String(production),
      unit: DEMO_ACTIVITY_UNITS[sourceIndex] ?? "",
    }
  })
}

function needsDemoMaterialScheduleSeed(projectId, dayId, slotId) {
  return !hasScheduleTypeData(projectId, dayId, slotId, ACTUAL_COST_SCHEDULE_TYPE)
}

function ensureDemoSlotsForDay(projectId, dayId) {
  const existing = getSlotsForDay(projectId, dayId)
  if (existing.length > 0) return existing

  const dailyFile = getDailyFile(projectId, dayId)
  if (!dailyFile) return []

  const slots = DAILY_SLOT_TEMPLATES.slice(0, LOCAL_DEV_HOURLY_SLOT_COUNT).map((template) =>
    buildBlankSlotWithActivities(template)
  )
  writeProjectDaySlots(projectId, dayId, sortSlots(slots))
  return getSlotsForDay(projectId, dayId)
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
  if (typeof window === "undefined") return false
  if (!shouldSeedLocalDevValuations()) return false

  purgeTargetCostMaterialSchedules()

  let changed = false

  for (const file of getDailyFiles(projectId)) {
    const slots = ensureDemoSlotsForDay(projectId, file.id)
    if (slots.length === 0) continue

    let dayChanged = false

    slots.forEach((slot, slotIndex) => {
      if (!needsDemoMaterialScheduleSeed(projectId, file.id, slot.id)) {
        return
      }

      saveMaterialScheduleRows(
        projectId,
        file.id,
        slot.id,
        ACTUAL_COST_SCHEDULE_TYPE,
        buildDemoMaterialRows(file.id, projectId, slotIndex)
      )
      dayChanged = true
      changed = true
    })

    if (dayChanged) {
      writeProjectDaySlots(projectId, file.id, sortSlots(getSlotsForDay(projectId, file.id)))
    }
  }

  return changed
}

export function seedLocalDevValuationDemo(projectId = null) {
  if (typeof window === "undefined") return false
  if (!shouldSeedLocalDevValuations()) return false

  const projectIds = new Set()
  if (projectId) projectIds.add(projectId)

  for (const project of getCustomProjects()) {
    if (project.status === PROJECT_STATUS.ENDED) continue
    if (project?.id) projectIds.add(project.id)
  }

  let changed = false
  for (const id of projectIds) {
    if (ensureDemoMaterialSchedules(id)) {
      changed = true
    }
    if (ensureDemoPlantOnSiteData(id)) {
      changed = true
    }
  }

  return changed
}

export function ensureDemoRateAnalysisData(projectId = SEEDED_PROJECT_ID) {
  if (typeof window === "undefined") return
  if (!shouldUseDemoValues(projectId) && !shouldSeedLocalDevValuations()) return

  ensureDemoMaterialSchedules(projectId)
}
