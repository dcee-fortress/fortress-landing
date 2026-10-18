import {
  getGoodsReceivedDashboardLinesForDayIds,
  getGoodsReceivedDayIds,
} from "@/lib/goodsReceived"
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

function receivedByDescription(projectId, dayId) {
  const map = new Map()
  for (const line of getGoodsReceivedDashboardLinesForDayIds(projectId, [dayId])) {
    const key = descriptionKey(line.description)
    if (!key || line.description === "—") continue
    map.set(key, {
      description: String(line.description).trim(),
      unit: String(line.unit || "").trim(),
      quantity: roundMaterialAmount(line.quantity) ?? 0,
    })
  }
  return map
}

/** Daily files plus any day that already has goods received, through the last day we need. */
function timelineDayIds(projectId, lastDayId) {
  const throughId = throughDayId(projectId)
  const cap = [lastDayId, throughId].filter(Boolean).sort()[0] || ""
  const startId = projectStartDayId(projectId)
  const ids = new Set(
    getMaterialOnSiteProjectDayIds(projectId).filter((dayId) => !cap || dayId <= cap)
  )

  for (const dayId of getGoodsReceivedDayIds(projectId)) {
    if (dayId >= startId && (!cap || dayId <= cap)) ids.add(dayId)
  }

  return [...ids].sort()
}

function forEachMaterialDay(projectId, lastDayId, visit) {
  const running = new Map()

  for (const dayId of timelineDayIds(projectId, lastDayId)) {
    const received = receivedByDescription(projectId, dayId)
    const edits = readDayEdits(projectId, dayId)
    const keys = new Set([...running.keys(), ...received.keys(), ...Object.keys(edits)])
    const nextRunning = new Map()
    let hasStock = false

    for (const key of keys) {
      const receipt = received.get(key)
      const edit = edits[key]
      const carried = running.get(key)
      const description = receipt?.description || edit?.description || carried?.description || ""
      if (!descriptionKey(description)) continue

      const unit = receipt?.unit || carried?.unit || ""
      const opening = carried?.left || 0
      const quantity = receipt?.quantity || 0
      const goodsUsed = roundMaterialAmount(usedAmount(edit?.goodsUsed)) ?? 0
      const goodsOnSite = roundMaterialAmount(opening + quantity) ?? 0
      const goodsLeft = roundMaterialAmount(goodsOnSite - goodsUsed) ?? 0
      const location = String(edit?.location || "").trim()

      if (opening !== 0 || quantity !== 0 || goodsUsed !== 0 || goodsLeft !== 0) hasStock = true
      visit({
        dayId,
        key,
        description,
        unit,
        opening,
        quantity,
        goodsUsed,
        location,
      })

      if (goodsLeft !== 0) nextRunning.set(key, { description, unit, left: goodsLeft })
    }

    running.clear()
    for (const [key, value] of nextRunning) running.set(key, value)
    if (hasStock) visit({ dayId, stock: true })
  }
}

/**
 * Goods on site for a day is goods left from the previous day plus goods received that day.
 * For several days, goods on site is the quantity carried into the period plus goods received
 * in the period. Goods used adds up. Goods left is goods on site minus goods used.
 */
export function getMaterialOnSiteRows(projectId, dayIds) {
  const period = [...(dayIds || [])].filter((dayId) => /^\d{4}-\d{2}-\d{2}$/.test(dayId)).sort()
  if (period.length === 0) return []

  const firstDayId = period[0]
  const lastDayId = period[period.length - 1]
  const totals = new Map()

  forEachMaterialDay(projectId, lastDayId, (event) => {
    if (event.stock || event.dayId < firstDayId) return
    const current = totals.get(event.key) ?? {
      description: event.description,
      unit: event.unit,
      opening: event.opening,
      received: 0,
      goodsUsed: 0,
      locations: [],
    }
    current.description = event.description || current.description
    if (event.unit) current.unit = event.unit
    current.received = roundMaterialAmount(current.received + event.quantity) ?? current.received
    current.goodsUsed = roundMaterialAmount(current.goodsUsed + event.goodsUsed) ?? current.goodsUsed
    if (event.location && !current.locations.includes(event.location)) {
      current.locations.push(event.location)
    }
    totals.set(event.key, current)
  })

  return [...totals.entries()]
    .map(([key, row]) => {
      const goodsOnSite = roundMaterialAmount(row.opening + row.received) ?? 0
      const goodsUsed = row.goodsUsed
      return {
        key,
        description: row.description,
        unit: row.unit,
        goodsOnSite,
        goodsUsed,
        location: row.locations.join(", "),
        goodsLeft: roundMaterialAmount(goodsOnSite - goodsUsed) ?? 0,
      }
    })
    .filter((row) => row.goodsOnSite !== 0 || row.goodsUsed !== 0 || row.goodsLeft !== 0)
    .sort((left, right) => left.description.localeCompare(right.description))
}

/** Days whose material schedule has goods on site, goods used, or goods left. */
export function getMaterialOnSiteStockDayIds(projectId) {
  const ids = []
  forEachMaterialDay(projectId, throughDayId(projectId), (event) => {
    if (event.stock) ids.push(event.dayId)
  })
  return ids
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
