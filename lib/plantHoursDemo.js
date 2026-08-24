import { isTodayDayId, parseDayId, startOfDay } from "@/lib/dailyFiles"
import {
  hasStoredPlantHoursEntry,
  saveDailyPlantHoursData,
} from "@/lib/plantHoursData"
import { getProjectStartDate } from "@/lib/periodFiles"
import { getDailyFiles } from "@/lib/projects"
import { SEEDED_PROJECT_ID } from "@/lib/projectRegistry"

const DEMO_PLANT_FLEET = [
  { plantNumber: "EX-01", plantDescription: "20t Excavator" },
  { plantNumber: "GR-02", plantDescription: "Motor Grader" },
  { plantNumber: "RL-03", plantDescription: "Vibratory Roller" },
  { plantNumber: "DT-04", plantDescription: "Articulated Dump Truck" },
  { plantNumber: "TL-05", plantDescription: "Wheel Loader" },
  { plantNumber: "BD-06", plantDescription: "Bulldozer D6" },
]

function getDayNumber(dayId, projectId) {
  const projectStart = startOfDay(getProjectStartDate(projectId))
  const day = startOfDay(parseDayId(dayId))
  return Math.max(1, Math.floor((day - projectStart) / (1000 * 60 * 60 * 24)) + 1)
}

export function buildDemoPlantHoursEntry(dayId, projectId = SEEDED_PROJECT_ID) {
  const dayNumber = getDayNumber(dayId, projectId)
  const rowCount = 2 + (dayNumber % 2)
  const rows = []

  for (let index = 0; index < rowCount; index += 1) {
    const plant = DEMO_PLANT_FLEET[(dayNumber + index) % DEMO_PLANT_FLEET.length]
    const startHour = 7 + (index % 2)
    const finishHour = 15 + (dayNumber % 4) + index

    rows.push({
      id: `demo-plant-hours-${dayId}-${index}`,
      plantNumber: plant.plantNumber,
      plantDescription: plant.plantDescription,
      startHours: String(startHour + (index === 0 ? 0 : 0.5)),
      finishHours: String(Math.min(finishHour, 18) + (index === 0 ? 0 : 0.5)),
    })
  }

  return {
    dayId,
    rows,
    demo: true,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Seed demo plant hours for every daily file from project start through today,
 * mirroring how valuation demo files are auto-created for the Roads project.
 * Skips days that already have stored entries (including user edits).
 */
export function ensurePlantHoursDemoThroughToday(projectId = SEEDED_PROJECT_ID) {
  if (typeof window === "undefined") return
  if (!shouldUseDemoValues(projectId)) return

  for (const file of getDailyFiles(projectId)) {
    if (hasStoredPlantHoursEntry(projectId, file.id)) continue
    saveDailyPlantHoursData(projectId, file.id, buildDemoPlantHoursEntry(file.id, projectId))
  }
}

export function getPlantHoursDailyFileStatus(projectId, file) {
  const isToday = isTodayDayId(file.id)
  const hasData = hasStoredPlantHoursEntry(projectId, file.id)

  if (isToday && !hasData) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for plant hours entry",
    }
  }

  if (isToday && hasData) {
    return {
      key: "in-progress",
      label: "In progress",
      description: "Plant hours being recorded today",
    }
  }

  if (hasData) {
    return {
      key: "completed",
      label: "Completed",
      description: `Completed ${file.completedAt}`,
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "No plant hours saved for this day",
  }
}

export { clearPlantHoursForProject } from "@/lib/plantHoursData"
