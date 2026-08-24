import { DAILY_SLOT_TEMPLATES, sortSlots } from "@/lib/dailySlots"
import { getTodayDayId, isTodayDayId } from "@/lib/dailyFiles"
import { isDemoValuesEnabled } from "@/lib/demoMode"
import {
  buildDefaultSlotWithActivities,
  buildDefaultSlotsWithActivities,
  writeProjectDaySlots,
} from "@/lib/projectData"
import { getProjectStoreDayIds } from "@/lib/periodFiles"
import { getDailyFile } from "@/lib/projects"
import { SEEDED_PROJECT_ID } from "@/lib/projectRegistry"

export const DEMO_TODAY_SLOT_ID = DAILY_SLOT_TEMPLATES[0].id
export const DEMO_TODAY_SLOT_LABEL = "07:00 – 09:00"

export function buildDemoSlotsForDay(dailyFile) {
  if (!dailyFile) return []

  if (isTodayDayId(dailyFile.id)) {
    return [
      buildDefaultSlotWithActivities(
        DAILY_SLOT_TEMPLATES[0],
        dailyFile,
        0,
        DAILY_SLOT_TEMPLATES.length
      ),
    ]
  }

  return buildDefaultSlotsWithActivities(dailyFile)
}

export function ensureTodayDemoHourlyDashboard(projectId = SEEDED_PROJECT_ID) {
  if (typeof window === "undefined") return
  if (!isDemoValuesEnabled() || projectId !== SEEDED_PROJECT_ID) return

  const todayId = getTodayDayId()
  if (getProjectStoreDayIds(projectId).includes(todayId)) return

  const dailyFile = getDailyFile(projectId, todayId)
  if (!dailyFile) return

  writeProjectDaySlots(projectId, todayId, sortSlots(buildDemoSlotsForDay(dailyFile)))
}

export function clearRoadsDemoHourlyDashboards(projectId = SEEDED_PROJECT_ID) {
  if (typeof window === "undefined") return

  const storeKey = "grove-primary-project-data"
  const raw = window.localStorage.getItem(storeKey)
  if (!raw) return

  try {
    const store = JSON.parse(raw)
    delete store[projectId]
    window.localStorage.setItem(storeKey, JSON.stringify(store))
  } catch {
    // ignore
  }
}
