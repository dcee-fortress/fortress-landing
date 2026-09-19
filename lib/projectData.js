import { getGroveItem, removeGroveItem } from "@/lib/groveClientStore"
import {
  buildEarnedValueActivities,
  summarizeEarnedValueActivities,
} from "@/lib/activities"
import {
  DAILY_SLOT_TEMPLATES,
  sortSlots,
} from "@/lib/dailySlots"
import {
  getDailyFile,
  getDailyFiles,
  getMonthlyFile,
  getWeeklyFile,
} from "@/lib/projectFiles"
import {
  syncActivitiesFromMaterialSchedules,
  hasMaterialScheduleDataForDay,
  getActualCostTotalForDay,
  getMaterialScheduleDayIds,
} from "@/lib/materialSchedule"
import { ensurePeriodFilesForDay } from "@/lib/periodFiles"
import {
  getCustomProjectById,
  getCustomProjects,
  getProjectEffectiveThroughDate,
  isEndedProject,
} from "@/lib/projectRegistry"
import { addDays, dayIdFromDate, getTodayDayId, parseDayId } from "@/lib/dailyFiles"
import { parsePlantCostAmount } from "@/lib/plantCostCalculations"
import {
  getDaySummaryForDisplay,
  getMonthSummaryForDisplay,
  getProjectSummaryForDisplay,
  getWeekSummaryForDisplay,
} from "@/lib/demoMode"

export const PROJECT_DATA_STORAGE_KEY = "grove-primary-project-data"
const DAILY_REPORT_NOTE_STORAGE_KEY = "grove-daily-report-notes"

function splitDailyTotal(total, parts) {
  const base = Math.floor(total / parts)
  const values = Array.from({ length: parts }, () => base)
  let remainder = total - base * parts

  for (let index = 0; remainder > 0; index += 1) {
    values[index % parts] += 1
    remainder -= 1
  }

  return values
}

export function formatSlotLabel(startTime, endTime) {
  if (!startTime || !endTime) return "Hourly dashboard"
  return `${startTime} – ${endTime}`
}

export function parseTimeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function normalizeActivity(activity) {
  return {
    id: activity.id ?? `activity-${Math.random().toString(36).slice(2, 9)}`,
    description: activity.description ?? "",
    valueEarned: parsePlantCostAmount(activity.valueEarned) ?? 0,
    production: parsePlantCostAmount(activity.production) ?? 0,
  }
}

export function normalizeSlot(slot, _dailyFile, template) {
  const startTime = slot.startTime ?? template?.startTime ?? "07:00"
  const endTime = slot.endTime ?? template?.endTime ?? "09:00"

  return {
    id: slot.id,
    startTime,
    endTime,
    label: formatSlotLabel(startTime, endTime),
    order: slot.order ?? template?.order ?? 0,
    activities: [],
  }
}

export function buildBlankSlotWithActivities(template) {
  return {
    id: template.id,
    startTime: template.startTime,
    endTime: template.endTime,
    label: formatSlotLabel(template.startTime, template.endTime),
    order: template.order,
    activities: [],
  }
}

export function buildBlankSlotsWithActivities() {
  return DAILY_SLOT_TEMPLATES.map((template) => buildBlankSlotWithActivities(template))
}

export function buildDefaultSlotWithActivities(template, dailyFile, slotIndex, slotCount) {
  const earned = splitDailyTotal(dailyFile.valueEarned ?? 0, slotCount)
  const output = splitDailyTotal(dailyFile.production ?? 0, slotCount)

  const activities = buildEarnedValueActivities({
    valueEarned: earned[slotIndex],
    production: output[slotIndex],
  })

  return {
    id: template.id,
    startTime: template.startTime,
    endTime: template.endTime,
    label: formatSlotLabel(template.startTime, template.endTime),
    order: template.order,
    activities,
  }
}

export function buildDefaultSlotsWithActivities(dailyFile) {
  const slotCount = DAILY_SLOT_TEMPLATES.length

  return DAILY_SLOT_TEMPLATES.map((template, index) =>
    buildDefaultSlotWithActivities(template, dailyFile, index, slotCount)
  )
}

function migrateLegacyStore(parsed) {
  if (!parsed || typeof parsed !== "object") return {}

  const hasLegacyDayKeys = Object.keys(parsed).some((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
  if (hasLegacyDayKeys) {
    return { "1": parsed }
  }

  return parsed
}

let storeCache = null
let storeCacheRaw = null

function readStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = getGroveItem(PROJECT_DATA_STORAGE_KEY)
    if (storeCache !== null && raw === storeCacheRaw) {
      return storeCache
    }

    const parsed = raw ? migrateLegacyStore(JSON.parse(raw)) : {}
    storeCache = parsed
    storeCacheRaw = raw
    return parsed
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return Promise.resolve()

  const serialized = JSON.stringify(store)
  // Keep the in-memory valuation store current immediately so dashboards and
  // material-schedule links appear without waiting on Postgres.
  storeCache = store
  storeCacheRaw = serialized

  const currentRaw = getGroveItem(PROJECT_DATA_STORAGE_KEY)
  if (serialized === currentRaw) {
    return Promise.resolve()
  }

  return import("@/lib/saveToPostgres")
    .then(({ saveGroveKey }) => saveGroveKey(PROJECT_DATA_STORAGE_KEY, serialized, { replace: true }))
    .then((saved) => {
      storeCache = store
      storeCacheRaw = typeof saved === "string" ? saved : serialized
    })
}

export function invalidateProjectDataCache() {
  storeCache = null
  storeCacheRaw = null
}

export function removeProjectData(projectId) {
  const store = readStore()
  delete store[projectId]
  writeStore(store)
}

export function clearAllProjectData() {
  if (typeof window === "undefined") return
  removeGroveItem(PROJECT_DATA_STORAGE_KEY)
  invalidateProjectDataCache()
}

export function stripLegacyTargetCostFromStoredActivities(projectId) {
  const store = readStore()
  const projectStore = store[projectId]
  if (!projectStore) return false

  let changed = false

  for (const dayId of Object.keys(projectStore)) {
    const slots = projectStore[dayId]
    if (!Array.isArray(slots)) continue

    projectStore[dayId] = slots.map((slot) => ({
      ...slot,
      activities: (slot.activities ?? []).map((activity) => ({
        id: activity.id,
        description: activity.description ?? "",
        valueEarned: parsePlantCostAmount(activity.valueEarned) ?? 0,
        production: parsePlantCostAmount(activity.production) ?? 0,
      })),
    }))
    changed = true
  }

  if (changed) {
    store[projectId] = projectStore
    writeStore(store)
  }

  return changed
}

export function getDailyFileById(projectId, dayId) {
  return getDailyFile(projectId, dayId)
}

function applyMaterialSchedulesToSlot(projectId, dayId, slot) {
  return {
    ...slot,
    activities: syncActivitiesFromMaterialSchedules(projectId, dayId, slot),
  }
}

export function getSlotsForDay(projectId, dayId) {
  const dailyFile = getDailyFileById(projectId, dayId) || { id: dayId, label: dayId }
  const store = readStore()
  const projectStore = store[projectId] ?? {}
  const stored = projectStore[dayId]

  if (!stored?.length) {
    return []
  }

  const uniqueSlots = []
  const seen = new Set()
  for (const slot of stored) {
    if (!slot?.id || seen.has(slot.id)) continue
    seen.add(slot.id)
    uniqueSlots.push(slot)
  }

  return sortSlots(
    uniqueSlots.map((slot) => {
      const template = DAILY_SLOT_TEMPLATES.find((item) => item.id === slot.id)
      const normalized = normalizeSlot(slot, dailyFile, template)
      return applyMaterialSchedulesToSlot(projectId, dayId, normalized)
    })
  )
}

export function getProjectStoreDayIds(projectId) {
  const store = readStore()
  const projectStore = store[projectId] ?? {}

  return Object.keys(projectStore).filter(
    (dayId) =>
      /^\d{4}-\d{2}-\d{2}$/.test(dayId) &&
      Array.isArray(projectStore[dayId]) &&
      projectStore[dayId].length > 0
  )
}

function serializeSlotForStorage(slot) {
  return {
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    label: slot.label,
    order: slot.order,
  }
}

export function saveSlotsForDay(projectId, dayId, slots) {
  const store = readStore()
  const projectStore = store[projectId] ?? {}
  const uniqueSlots = []
  const seen = new Set()
  for (const slot of sortSlots(slots.map(serializeSlotForStorage))) {
    if (!slot?.id || seen.has(slot.id)) continue
    seen.add(slot.id)
    uniqueSlots.push(slot)
  }
  projectStore[dayId] = uniqueSlots
  store[projectId] = projectStore
  return writeStore(store)
}

export function stripLegacyStoredSlotActivities(projectId) {
  const store = readStore()
  const projectStore = store[projectId]
  if (!projectStore) return false

  let changed = false

  for (const dayId of Object.keys(projectStore)) {
    const slots = projectStore[dayId]
    if (!Array.isArray(slots)) continue

    const hadLegacyActivities = slots.some((slot) => slot?.activities?.length)
    projectStore[dayId] = slots.map(serializeSlotForStorage)
    if (hadLegacyActivities) changed = true
  }

  if (changed) {
    store[projectId] = projectStore
    writeStore(store)
  }

  return changed
}

export function writeProjectDaySlots(projectId, dayId, slots) {
  saveSlotsForDay(projectId, dayId, slots)
}

export function mergeActivities(allActivities) {
  const grouped = new Map()

  for (const activity of allActivities) {
    const key = activity.description.trim() || "Untitled activity"
    const current = grouped.get(key) ?? {
      description: key,
      valueEarned: 0,
      production: 0,
    }

    const valueEarned = parsePlantCostAmount(activity.valueEarned) ?? 0
    const production = parsePlantCostAmount(activity.production) ?? 0

    grouped.set(key, {
      description: key,
      valueEarned: current.valueEarned + valueEarned,
      production: Math.round((current.production + production) * 100) / 100,
    })
  }

  return [...grouped.values()].map((row, index) => ({
    id: `merged-${index}-${row.description}`,
    ...row,
  }))
}

export function getSummaryFromSlots(slots) {
  const activities = slots.flatMap((slot) => slot.activities ?? [])
  return summarizeEarnedValueActivities(mergeActivities(activities))
}

export function getDaySummary(projectId, dayId) {
  return getDaySummaryFromSlots(projectId, dayId, getSlotsForDay(projectId, dayId))
}

export function getDaySummaryFromSlots(projectId, dayId, slots) {
  const file = getDailyFileById(projectId, dayId)
  const live = getSummaryFromSlots(slots)
  return getDaySummaryForDisplay(projectId, dayId, live, file)
}

export function getDayValueEarnedByIds(projectId, dayIds) {
  const values = {}

  for (const dayId of dayIds) {
    if (!hasMaterialScheduleDataForDay(projectId, dayId)) {
      values[dayId] = null
      continue
    }

    values[dayId] = getActualCostTotalForDay(projectId, dayId)
  }

  return values
}

export function getWeekValueEarnedByIds(projectId, weekIds) {
  const weekDayMap = {}
  const uniqueDayIds = new Set()

  for (const weekId of weekIds) {
    const dayIds = getDayIdsInWeek(projectId, weekId)
    weekDayMap[weekId] = dayIds
    for (const dayId of dayIds) {
      uniqueDayIds.add(dayId)
    }
  }

  const dayTotals = getDayValueEarnedByIds(projectId, [...uniqueDayIds])
  const values = {}

  for (const weekId of weekIds) {
    values[weekId] = weekDayMap[weekId].reduce((sum, dayId) => sum + (dayTotals[dayId] ?? 0), 0)
  }

  return values
}

export function getMonthValueEarnedByIds(projectId, monthIds) {
  const monthDayMap = {}
  const uniqueDayIds = new Set()

  for (const monthId of monthIds) {
    const dayIds = getDayIdsInMonth(projectId, monthId)
    monthDayMap[monthId] = dayIds
    for (const dayId of dayIds) {
      uniqueDayIds.add(dayId)
    }
  }

  const dayTotals = getDayValueEarnedByIds(projectId, [...uniqueDayIds])
  const values = {}

  for (const monthId of monthIds) {
    values[monthId] = monthDayMap[monthId].reduce((sum, dayId) => sum + (dayTotals[dayId] ?? 0), 0)
  }

  return values
}

export function getDayIdsInWeek(projectId, weekId) {
  const week = getWeeklyFile(projectId, weekId)
  if (!week) return []

  const [year, month, day] = weekId.split("-").map(Number)
  const start = new Date(year, month - 1, day)

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
  }).filter((dayId) => getDailyFileById(projectId, dayId))
}

export function getDayIdsInMonth(projectId, monthId) {
  const [year, month] = monthId.split("-").map(Number)

  return getDailyFiles(projectId)
    .filter((file) => {
      const [fileYear, fileMonth] = file.id.split("-").map(Number)
      return fileYear === year && fileMonth === month
    })
    .map((file) => file.id)
}

export function getSummaryForDayIds(projectId, dayIds) {
  const activities = dayIds.flatMap((dayId) => {
    if (!hasMaterialScheduleDataForDay(projectId, dayId)) {
      return []
    }

    const slots = getSlotsForDay(projectId, dayId)
    return slots.flatMap((slot) => slot.activities ?? [])
  })

  return summarizeEarnedValueActivities(mergeActivities(activities))
}

export function getWeekSummary(projectId, weekId) {
  const file = getWeeklyFile(projectId, weekId)
  const live = getSummaryForDayIds(projectId, getDayIdsInWeek(projectId, weekId))
  return getWeekSummaryForDisplay(projectId, weekId, live, file)
}

export function getMonthSummary(projectId, monthId) {
  const file = getMonthlyFile(projectId, monthId)
  const live = getSummaryForDayIds(projectId, getDayIdsInMonth(projectId, monthId))
  return getMonthSummaryForDisplay(projectId, monthId, live, file)
}

export function getProjectGrandTotalSummary(projectId) {
  const dayIds = getMaterialScheduleDayIds(projectId)
  const summary = getSummaryForDayIds(projectId, dayIds)

  return {
    rows: [],
    totals: summary.totals,
  }
}

export function getProjectSummary(projectId) {
  const live = getProjectGrandTotalSummary(projectId)

  return getProjectSummaryForDisplay(projectId, live)
}

export function getDayTotals(projectId, dayId) {
  const summary = getDaySummary(projectId, dayId)
  return summary.totals
}

export function createSlotFromTemplate(template) {
  return buildBlankSlotWithActivities(template)
}

export function ensureHourlyDashboardsForDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) return false

  const store = readStore()
  const projectStore = { ...(store[projectId] ?? {}) }
  const existing = projectStore[dayId]

  if (Array.isArray(existing) && existing.length > 0) {
    return false
  }

  const slots = [buildBlankSlotWithActivities(DAILY_SLOT_TEMPLATES[0])]
  projectStore[dayId] = sortSlots(slots.map(serializeSlotForStorage))
  store[projectId] = projectStore
  writeStore(store)
  return true
}

export function ensureHourlyDashboardsForDateRange(projectId, startDayId, throughDayId) {
  if (typeof window === "undefined" || !projectId || !startDayId || !throughDayId) {
    return false
  }

  if (startDayId > throughDayId) return false

  const store = readStore()
  const projectStore = store[projectId] ?? {}
  let changed = false

  let cursor = parseDayId(startDayId)
  const through = parseDayId(throughDayId)

  while (cursor <= through) {
    const dayId = dayIdFromDate(cursor)
    const existing = projectStore[dayId]
    if (!Array.isArray(existing) || existing.length === 0) {
      projectStore[dayId] = sortSlots(
        [buildBlankSlotWithActivities(DAILY_SLOT_TEMPLATES[0])].map(serializeSlotForStorage)
      )
      changed = true
    }
    cursor = addDays(cursor, 1)
  }

  if (changed) {
    store[projectId] = projectStore
    writeStore(store)
  }

  return changed
}

export function ensureHourlyDashboardsForProject(projectId) {
  // Only ensure today's slot so opening valuations stays fast.
  // Past days get a dashboard when the user opens that daily file.
  if (typeof window === "undefined" || !projectId) return false
  return ensureHourlyDashboardsForDay(projectId, getTodayDayId())
}

export function ensureChadcomStartDayHourlyDashboards() {
  if (typeof window === "undefined") return false

  let changed = false

  for (const project of getCustomProjects()) {
    if (!project?.id || isEndedProject(project)) continue
    if (ensureHourlyDashboardsForProject(project.id)) {
      changed = true
    }
  }

  return changed
}
