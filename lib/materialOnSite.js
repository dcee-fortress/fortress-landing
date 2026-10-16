import { getGoodsReceivedDashboardLinesForDayIds } from "@/lib/goodsReceived"
import { createMonthFile, getProjectStartDate, isMonthPeriodComplete } from "@/lib/periodFiles"
import { parsePlantCostAmount, roundMaterialAmount } from "@/lib/plantCostCalculations"
import { getDailyFile, getDailyFiles } from "@/lib/projectFiles"
import { getProjectEffectiveThroughDate } from "@/lib/projectRegistry"
import { createLocalStorageCache } from "@/lib/storageCache"
import { addDays, generateBlankWeeklyFiles, parseDayId, weekIdFromStart } from "@/lib/weeklyFiles"

export const MATERIAL_ON_SITE_STORAGE_KEY = "grove-material-on-site"

const materialOnSiteStore = createLocalStorageCache(MATERIAL_ON_SITE_STORAGE_KEY, {})
let saveChain = Promise.resolve()
let pendingStore = null
const listeners = new Set()

export function subscribeMaterialOnSite(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyMaterialOnSite() {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      // One dashboard failing to refresh should not block the save.
    }
  }
}

function dayKey(projectId, dayId) {
  return `${projectId}::${dayId}`
}

function descriptionKey(description) {
  return String(description || "").trim().toLowerCase()
}

function readStore() {
  if (pendingStore) return pendingStore
  const store = materialOnSiteStore.read()
  return store && typeof store === "object" ? store : {}
}

function readDayEdits(projectId, dayId) {
  const day = readStore()[dayKey(projectId, dayId)]
  return day && typeof day === "object" ? day : {}
}

export function saveMaterialOnSiteDay(projectId, dayId, drafts) {
  if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()

  const store = { ...readStore() }
  const storageKey = dayKey(projectId, dayId)
  const day = {}
  for (const [key, draft] of Object.entries(drafts || {})) {
    if (!key) continue
    day[key] = {
      description: String(draft?.description || "").trim(),
      goodsUsed: draft?.goodsUsed ?? "",
      location: draft?.location ?? "",
    }
  }
  store[storageKey] = day
  pendingStore = store
  notifyMaterialOnSite()
  const payload = store
  saveChain = saveChain
    .catch(() => {})
    .then(() =>
      materialOnSiteStore.write(payload).finally(() => {
        if (pendingStore === payload) pendingStore = null
      })
    )
  return saveChain
}

function usedAmount(value) {
  return parsePlantCostAmount(value) ?? 0
}

/**
 * One row per goods-received description. Goods on site is the received quantity.
 * Goods used and location are the saved entry for those days.
 */
export function getMaterialOnSiteRows(projectId, dayIds) {
  const lines = getGoodsReceivedDashboardLinesForDayIds(projectId, dayIds)
  const editsByKey = new Map()

  for (const dayId of dayIds || []) {
    const edits = readDayEdits(projectId, dayId)
    for (const [key, edit] of Object.entries(edits)) {
      const current = editsByKey.get(key) ?? { goodsUsed: 0, locations: [] }
      current.goodsUsed += usedAmount(edit?.goodsUsed)
      const location = String(edit?.location || "").trim()
      if (location && !current.locations.includes(location)) current.locations.push(location)
      editsByKey.set(key, current)
    }
  }

  return lines
    .filter((line) => descriptionKey(line.description) && line.description !== "—")
    .map((line) => {
      const key = descriptionKey(line.description)
      const edit = editsByKey.get(key)
      const goodsOnSite = roundMaterialAmount(line.quantity) ?? 0
      const goodsUsed = roundMaterialAmount(edit?.goodsUsed ?? 0) ?? 0
      return {
        key,
        description: line.description,
        unit: line.unit || "",
        goodsOnSite,
        goodsUsed,
        location: edit?.locations?.join(", ") || "",
        goodsLeft: roundMaterialAmount(goodsOnSite - goodsUsed) ?? 0,
      }
    })
}

/** One weekly file from the project start through the current week. A new file appears when the next week starts. */
export function getMaterialOnSiteWeeklyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const start = getProjectStartDate(projectId)
  const throughId = getProjectEffectiveThroughDate(projectId)
  const through = /^\d{4}-\d{2}-\d{2}$/.test(String(throughId || ""))
    ? parseDayId(throughId)
    : new Date()
  return generateBlankWeeklyFiles(start, through)
}

export function getMaterialOnSiteWeeklyFile(projectId, weekId) {
  return getMaterialOnSiteWeeklyFiles(projectId).find((file) => file.id === weekId) ?? null
}

/** Daily files already created inside this week. Later days join as the week goes on. */
export function getMaterialOnSiteWeekDayIds(projectId, weekId) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekId || ""))) return []
  const throughId = String(getProjectEffectiveThroughDate(projectId) || "")
  const start = parseDayId(weekId)
  const ids = []

  for (let index = 0; index < 7; index += 1) {
    const dayId = weekIdFromStart(addDays(start, index))
    if (throughId && dayId > throughId) continue
    if (getDailyFile(projectId, dayId)) ids.push(dayId)
  }

  return ids
}

function throughDayId(projectId) {
  return String(getProjectEffectiveThroughDate(projectId) || "")
}

function projectStartDayId(projectId) {
  const start = getProjectStartDate(projectId)
  return weekIdFromStart(start)
}

/** Daily files from the project start through today. Later days join as they are created. */
export function getMaterialOnSiteProjectDayIds(projectId) {
  const throughId = throughDayId(projectId)
  const startId = projectStartDayId(projectId)
  return getDailyFiles(projectId)
    .map((file) => file.id)
    .filter((dayId) => dayId >= startId && (!throughId || dayId <= throughId))
    .sort()
}

export function getMaterialOnSiteMonthlyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const start = getProjectStartDate(projectId)
  const throughId = throughDayId(projectId)
  const through = /^\d{4}-\d{2}-\d{2}$/.test(throughId) ? parseDayId(throughId) : new Date()
  const files = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const end = new Date(through.getFullYear(), through.getMonth(), 1)

  while (cursor <= end) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth() + 1
    const monthId = `${year}-${String(month).padStart(2, "0")}`
    files.push(createMonthFile(year, month, !isMonthPeriodComplete(monthId)))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return files.reverse()
}

export function getMaterialOnSiteMonthlyFile(projectId, monthId) {
  return getMaterialOnSiteMonthlyFiles(projectId).find((file) => file.id === monthId) ?? null
}

/** Daily files already created inside this month. */
export function getMaterialOnSiteMonthDayIds(projectId, monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ""))) return []
  const throughId = throughDayId(projectId)
  return getMaterialOnSiteProjectDayIds(projectId).filter(
    (dayId) => dayId.startsWith(`${monthId}-`) && (!throughId || dayId <= throughId)
  )
}

/** Daily files in a calendar year, for the yearly cumulative of each description. */
export function getMaterialOnSiteYearDayIds(projectId, year) {
  const yearId = String(year || "")
  if (!/^\d{4}$/.test(yearId)) return []
  return getMaterialOnSiteProjectDayIds(projectId).filter((dayId) => dayId.startsWith(`${yearId}-`))
}

export function getMaterialOnSiteYears(projectId) {
  return [
    ...new Set(getMaterialOnSiteProjectDayIds(projectId).map((dayId) => dayId.slice(0, 4))),
  ].sort((left, right) => right.localeCompare(left))
}

export function getMaterialOnSiteDayDraft(projectId, dayId, description) {
  const edit = readDayEdits(projectId, dayId)[descriptionKey(description)]
  return {
    goodsUsed: edit?.goodsUsed ?? "",
    location: edit?.location ?? "",
  }
}
