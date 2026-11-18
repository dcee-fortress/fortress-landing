import {
  addDays,
  dayIdFromDate,
  getTodayDayId,
  parseDayId,
  startOfDay,
} from "@/lib/dailyFiles"
import { bulkMaterialRequest, materialReceipts } from "@/lib/materialRegister"
import {
  parsePlantCostAmount,
  roundMaterialAmount,
  roundMaterialUnitPrice,
} from "@/lib/plantCostCalculations"
import { getProjectEffectiveThroughDate } from "@/lib/projectRegistry"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import { descriptionsMatch, groupBySimilarDescription } from "@/lib/similarDescriptions"
import { createLocalStorageCache } from "@/lib/storageCache"

export const MATERIAL_SITE_STOCK_STORAGE_KEY = "grove-material-site-stock"

const MANUAL_FILES_KEY = "__manualDailyFiles__"
const DELETED_DAYS_KEY = "__deletedDays__"
const EPOCH_KEY = "__goodsAcquiredFileEpoch__"
const CLEARED_KEY = "__goodsAcquiredClearedV2__"
const MODE_KEY = "__goodsAcquiredManualModeV1__"
const DAY_ID = /^\d{4}-\d{2}-\d{2}$/

const cache = createLocalStorageCache(MATERIAL_SITE_STOCK_STORAGE_KEY, {})

function dayKey(projectId, dayId) {
  return `${projectId}::${dayId}`
}

function amount(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialAmount(parsed) ?? 0
}

function money(value) {
  const parsed = parsePlantCostAmount(value)
  return parsed === null ? 0 : roundMaterialUnitPrice(parsed) ?? 0
}

function newRowId() {
  return `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function readIdList(store, key, projectId) {
  const bucket = store?.[key]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.filter((id) => DAY_ID.test(String(id))) : []
}

function writeProjectBucket(store, key, projectId, value) {
  return {
    ...store,
    [key]: {
      ...(store[key] && typeof store[key] === "object" ? store[key] : {}),
      [projectId]: value,
    },
  }
}

function writeManualDayIds(store, projectId, ids) {
  return writeProjectBucket(
    store,
    MANUAL_FILES_KEY,
    projectId,
    [...ids].filter((id) => DAY_ID.test(String(id))).sort((left, right) => right.localeCompare(left))
  )
}

function bumpEpoch(store, projectId) {
  return writeProjectBucket(store, EPOCH_KEY, projectId, Date.now())
}

function markManualMode(store, projectId) {
  let next = writeProjectBucket(store, CLEARED_KEY, projectId, true)
  return writeProjectBucket(next, MODE_KEY, projectId, true)
}

function buildFile(dayId) {
  return {
    id: dayId,
    dayId,
    label: formatDayLabelFromId(dayId) || dayId,
    date: dayId,
    isToday: dayId === getTodayDayId(),
  }
}

function readStore() {
  const store = cache.read()
  return store && typeof store === "object" ? store : {}
}

function hasExplicitBrought(row) {
  if (row?.broughtTouched === false) return false
  if (row?.broughtTouched === true) return true
  // Legacy rows only stored a quantity — treat that as an explicit override.
  return String(row?.broughtOnSite ?? "").trim() !== ""
}

function prepareRow(row) {
  const explicit = hasExplicitBrought(row)
  return {
    id: row?.id || newRowId(),
    description: String(row?.description ?? ""),
    broughtOnSite: explicit ? row?.broughtOnSite ?? "" : "",
    broughtOnSiteFormula: explicit ? String(row?.broughtOnSiteFormula ?? "") : "",
    broughtTouched: explicit,
    stock: row?.stock ?? "",
    stockFormula: String(row?.stockFormula ?? ""),
    materialUsed: row?.materialUsed ?? "",
    materialUsedFormula: String(row?.materialUsedFormula ?? ""),
  }
}

function rowHasEntry(row) {
  return Boolean(
    String(row?.description || "").trim() ||
      hasExplicitBrought(row) ||
      amount(row?.stock) ||
      amount(row?.materialUsed)
  )
}

function readRawRows(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) return []
  const raw = readStore()[dayKey(projectId, dayId)]
  return Array.isArray(raw) ? raw.map(prepareRow).filter(rowHasEntry) : []
}

function listDayIdsInclusive(fromId, throughId) {
  if (!DAY_ID.test(String(fromId || "")) || !DAY_ID.test(String(throughId || ""))) return []
  if (throughId < fromId) return []
  const ids = []
  let cursor = startOfDay(parseDayId(fromId))
  const end = startOfDay(parseDayId(throughId))
  while (cursor <= end) {
    ids.push(dayIdFromDate(cursor))
    cursor = addDays(cursor, 1)
  }
  return ids
}

function activityDayIds(projectId) {
  const ids = new Set(materialReceipts.getDayIds(projectId))
  const store = readStore()
  const prefix = `${projectId}::`
  for (const key of Object.keys(store)) {
    if (!key.startsWith(prefix)) continue
    const dayId = key.slice(prefix.length)
    if (!DAY_ID.test(dayId)) continue
    if (readRawRows(projectId, dayId).length > 0) ids.add(dayId)
  }
  return [...ids].sort()
}

function autoMaterialSiteDayIds(projectId) {
  const todayId = getTodayDayId()
  const throughRaw = String(getProjectEffectiveThroughDate(projectId) || todayId)
  const throughId = DAY_ID.test(throughRaw) ? throughRaw : todayId
  const activity = activityDayIds(projectId)
  // From first receipt/entry (or today) through today so leftovers can roll across every day.
  const fromId = activity[0] || todayId
  const endId = [throughId, todayId, activity.at(-1) || ""]
    .filter((id) => DAY_ID.test(String(id || "")))
    .sort()
    .at(-1)
  return listDayIdsInclusive(fromId, endId || todayId)
}

/** Create daily material on site files automatically through today so leftovers can roll. */
export async function ensureMaterialSiteAutoDailyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return false

  let store = { ...readStore() }
  const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
  const manual = new Set(readIdList(store, MANUAL_FILES_KEY, projectId))
  let changed = false

  for (const dayId of autoMaterialSiteDayIds(projectId)) {
    if (deleted.has(dayId) || manual.has(dayId)) continue
    manual.add(dayId)
    changed = true
  }

  const todayId = getTodayDayId()
  if (!deleted.has(todayId) && !manual.has(todayId)) {
    manual.add(todayId)
    changed = true
  }

  if (!changed) return false

  store = writeManualDayIds(store, projectId, manual)
  store = markManualMode(store, projectId)
  store = bumpEpoch(store, projectId)
  await cache.write(store)
  return true
}

export function getMaterialSiteDailyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = readStore()
  const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
  const manual = readIdList(store, MANUAL_FILES_KEY, projectId)
  const auto = autoMaterialSiteDayIds(projectId)
  return [...new Set([...manual, ...auto])]
    .filter((dayId) => !deleted.has(dayId))
    .sort((left, right) => right.localeCompare(left))
    .map(buildFile)
}

export function getMaterialSiteDailyFile(projectId, dayId) {
  if (!projectId || !dayId) return null
  const store = readStore()
  const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
  if (deleted.has(dayId)) return null
  return getMaterialSiteDailyFiles(projectId).find((file) => file.id === dayId) ?? null
}

export async function createMaterialSiteFileForToday(projectId) {
  if (typeof window === "undefined" || !projectId) return { ok: false, message: "Missing project." }
  await ensureMaterialSiteAutoDailyFiles(projectId)
  const dayId = getTodayDayId()
  let store = { ...readStore() }
  const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
  const manual = new Set(readIdList(store, MANUAL_FILES_KEY, projectId))
  if ((manual.has(dayId) || autoMaterialSiteDayIds(projectId).includes(dayId)) && !deleted.has(dayId)) {
    if (!manual.has(dayId)) {
      manual.add(dayId)
      store = writeManualDayIds(store, projectId, manual)
      store = markManualMode(store, projectId)
      store = bumpEpoch(store, projectId)
      await cache.write(store)
    }
    return {
      ok: true,
      alreadyExists: true,
      dayId,
      file: buildFile(dayId),
      message: "Today's material on site file already exists.",
    }
  }
  manual.add(dayId)
  deleted.delete(dayId)
  store = writeManualDayIds(store, projectId, manual)
  store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())
  store = markManualMode(store, projectId)
  store = bumpEpoch(store, projectId)
  await cache.write(store)
  return { ok: true, dayId, file: buildFile(dayId) }
}

export async function renameMaterialSiteFile(projectId, fromDayId, toDayId) {
  if (!projectId || !DAY_ID.test(String(fromDayId || "")) || !DAY_ID.test(String(toDayId || ""))) {
    return { ok: false, message: "Choose a valid date." }
  }
  if (fromDayId === toDayId) return { ok: true, dayId: toDayId, file: buildFile(toDayId) }

  let store = { ...readStore() }
  const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
  const manual = new Set(readIdList(store, MANUAL_FILES_KEY, projectId))
  if (!manual.has(fromDayId) || deleted.has(fromDayId)) {
    return { ok: false, message: "That material on site file could not be found." }
  }
  if (manual.has(toDayId) && !deleted.has(toDayId)) {
    return { ok: false, message: "A material on site file already exists for that date." }
  }

  const fromKey = dayKey(projectId, fromDayId)
  const toKey = dayKey(projectId, toDayId)
  if (store[fromKey] !== undefined) store[toKey] = store[fromKey]
  delete store[fromKey]
  manual.delete(fromDayId)
  manual.add(toDayId)
  deleted.add(fromDayId)
  deleted.delete(toDayId)
  store = writeManualDayIds(store, projectId, manual)
  store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())
  store = markManualMode(store, projectId)
  store = bumpEpoch(store, projectId)
  await cache.write(store)
  return { ok: true, dayId: toDayId, file: buildFile(toDayId) }
}

export async function deleteMaterialSiteFile(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { ok: false, message: "Missing project or day." }
  }
  let store = { ...readStore() }
  const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
  const manual = new Set(readIdList(store, MANUAL_FILES_KEY, projectId))
  delete store[dayKey(projectId, dayId)]
  manual.delete(dayId)
  deleted.add(dayId)
  store = writeManualDayIds(store, projectId, manual)
  store = writeProjectBucket(store, DELETED_DAYS_KEY, projectId, [...deleted].sort())
  store = markManualMode(store, projectId)
  store = bumpEpoch(store, projectId)
  await cache.write(store)
  return { ok: true }
}

export function getMaterialSiteSavedRows(projectId, dayId) {
  const rows = readRawRows(projectId, dayId)
  return rows.length > 0 ? rows : [prepareRow({})]
}

export function saveMaterialSiteRows(projectId, dayId, rows) {
  if (typeof window === "undefined" || !projectId || !dayId) return Promise.resolve()
  let store = { ...readStore() }
  const cleaned = (Array.isArray(rows) ? rows : []).map(prepareRow).filter(rowHasEntry)
  const key = dayKey(projectId, dayId)
  if (cleaned.length === 0) delete store[key]
  else store[key] = cleaned
  store = markManualMode(store, projectId)
  store = bumpEpoch(store, projectId)
  return cache.write(store)
}

function receivedLinesForDay(projectId, dayId) {
  return materialReceipts
    .getDashboardLinesForDay(projectId, dayId)
    .filter((line) => String(line.description || "").trim() && line.description !== "—")
    .map((line) => ({
      description: String(line.description).trim(),
      received: amount(line.quantity),
      kind: "received",
    }))
}

function manualLinesForDay(projectId, dayId) {
  return readRawRows(projectId, dayId).map((row) => ({
    description: String(row.description || "").trim() || "—",
    brought: hasExplicitBrought(row) ? amount(row.broughtOnSite) : null,
    legacyStock: amount(row.stock),
    used: amount(row.materialUsed),
    kind: "manual",
  }))
}

function relevantDayIds(projectId, extraDayId) {
  const activity = activityDayIds(projectId)
  if (DAY_ID.test(String(extraDayId || ""))) activity.push(extraDayId)
  const unique = [...new Set(activity.filter((id) => DAY_ID.test(id)))].sort()
  if (unique.length === 0) {
    return DAY_ID.test(String(extraDayId || "")) ? [extraDayId] : []
  }
  const endId = [unique.at(-1), extraDayId, getTodayDayId()]
    .filter((id) => DAY_ID.test(String(id || "")))
    .sort()
    .at(-1)
  return listDayIdsInclusive(unique[0], endId)
}

function sum(values) {
  return values.reduce((total, value) => roundMaterialAmount(total + value) ?? total, 0)
}

/**
 * Material on site for a day = leftover from the previous day + material received/brought that day.
 * Material left = material on site − material used, and that leftover rolls to the next day.
 */
function replay(projectId, throughDayId) {
  const snapshots = new Map()
  let carried = new Map()

  for (const dayId of relevantDayIds(projectId, throughDayId)) {
    if (throughDayId && dayId > throughDayId) break

    const tagged = [
      ...[...carried.values()].map((item) => ({
        description: item.description,
        opening: item.left,
        kind: "opening",
      })),
      ...receivedLinesForDay(projectId, dayId),
      ...manualLinesForDay(projectId, dayId),
    ]
    const groups = groupBySimilarDescription(tagged, (item) => item.description)
    const lines = []
    const nextCarried = new Map()

    for (const group of groups) {
      let opening = 0
      let received = 0
      let explicitBrought = null
      let legacyStock = 0
      let materialUsed = 0
      for (const item of group.items) {
        if (item.kind === "opening") opening = sum([opening, item.opening])
        if (item.kind === "received") received = sum([received, item.received])
        if (item.kind === "manual") {
          if (item.brought !== null) {
            explicitBrought = sum([explicitBrought || 0, item.brought])
          }
          legacyStock = sum([legacyStock, item.legacyStock])
          materialUsed = sum([materialUsed, item.used])
        }
      }
      const newlyBrought = sum([received, legacyStock])
      const broughtOnSite =
        explicitBrought === null ? sum([opening, newlyBrought]) : explicitBrought
      const materialLeft = sum([broughtOnSite, -materialUsed])
      if (broughtOnSite !== 0 || materialUsed !== 0 || materialLeft !== 0 || opening !== 0) {
        lines.push({
          id: `site-${dayId}-${lines.length}`,
          description: group.description,
          opening,
          newlyBrought: explicitBrought === null ? newlyBrought : sum([broughtOnSite, -opening]),
          broughtOnSite,
          materialUsed,
          materialLeft,
        })
      }
      if (materialLeft !== 0) {
        nextCarried.set(group.description.trim().toLowerCase(), {
          description: group.description,
          left: materialLeft,
        })
      }
    }

    carried = nextCarried
    snapshots.set(dayId, lines)
  }

  return { snapshots, carried }
}

export function getMaterialSiteDashboardLines(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) return []
  return replay(projectId, dayId).snapshots.get(dayId) || []
}

export function getMaterialSiteProjectLines(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const days = relevantDayIds(projectId)
  const { snapshots } = replay(projectId, days.at(-1) || "")
  const totals = []
  const latestLeft = new Map()

  for (const [dayId, lines] of snapshots.entries()) {
    for (const line of lines) {
      totals.push({
        description: line.description,
        newlyBrought: line.newlyBrought ?? line.broughtOnSite,
        materialUsed: line.materialUsed,
      })
      latestLeft.set(String(line.description || "").trim().toLowerCase(), {
        description: line.description,
        materialLeft: line.materialLeft,
        dayId,
      })
    }
  }

  return groupBySimilarDescription(totals, (line) => line.description)
    .map((group, index) => {
      const broughtOnSite = sum(group.items.map((item) => item.newlyBrought))
      const materialUsed = sum(group.items.map((item) => item.materialUsed))
      const leftKey = String(group.description || "").trim().toLowerCase()
      const materialLeft =
        latestLeft.get(leftKey)?.materialLeft ?? sum([broughtOnSite, -materialUsed])
      return {
        id: `site-project-${index}`,
        description: group.description,
        broughtOnSite,
        materialUsed,
        materialLeft,
      }
    })
    .filter((line) => line.broughtOnSite !== 0 || line.materialUsed !== 0 || line.materialLeft !== 0)
    .sort((left, right) => left.description.localeCompare(right.description))
}

export function getMaterialSiteEntryStatus(projectId, file) {
  const hasData = getMaterialSiteDashboardLines(projectId, file.id).length > 0
  const isToday = file.id === getTodayDayId()
  if (hasData) {
    return {
      key: "in-progress",
      label: isToday ? "In progress" : "Saved",
      description: isToday
        ? "Material on site entry entered today — you can still edit"
        : "Saved — you can still edit this file at any time",
    }
  }
  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for material on site entry",
  }
}

function takeReceived(received, description) {
  let total = 0
  for (const line of received) {
    if (line.claimed || !descriptionsMatch(line.description, description)) continue
    line.claimed = true
    total = sum([total, line.received])
  }
  return total
}

function takeOpening(openingLines, description) {
  let total = 0
  for (const line of openingLines) {
    if (line.claimed || !descriptionsMatch(line.description, description)) continue
    line.claimed = true
    total = sum([total, line.opening])
  }
  return total
}

function previousDayOpeningLines(projectId, dayId) {
  const days = relevantDayIds(projectId, dayId).filter((id) => id < dayId)
  if (days.length === 0) return []
  const previousId = days.at(-1)
  const lines = replay(projectId, previousId).snapshots.get(previousId) || []
  return lines
    .filter((line) => (line.materialLeft ?? 0) !== 0)
    .map((line) => ({
      description: line.description,
      opening: line.materialLeft,
      claimed: false,
    }))
}

export function getMaterialSiteEntryRows(projectId, dayId) {
  const saved = readRawRows(projectId, dayId)
  const received = receivedLinesForDay(projectId, dayId).map((line) => ({ ...line, claimed: false }))
  const openingLines = previousDayOpeningLines(projectId, dayId)
  const seeds = saved.map((row) => ({ ...row, fromReceived: false, fromCarry: false }))

  for (const line of [...openingLines, ...received]) {
    const described = String(line.description || "").trim()
    if (!described || described === "—") continue
    if (seeds.some((row) => descriptionsMatch(row.description, described))) continue
    seeds.push({
      ...prepareRow({
        id: `${line.opening != null ? "carry" : "brought"}-${described.toLowerCase()}`,
        description: described,
        broughtTouched: false,
      }),
      fromReceived: line.received != null,
      fromCarry: line.opening != null,
    })
  }

  return (seeds.length > 0 ? seeds : [prepareRow({})]).map((row) => {
    const openingQuantity = takeOpening(openingLines, row.description)
    const receivedQuantity = takeReceived(received, row.description)
    const broughtNumber = hasExplicitBrought(row)
      ? amount(row.broughtOnSite)
      : sum([openingQuantity, receivedQuantity, amount(row.stock)])
    return {
      ...row,
      broughtOnSite: hasExplicitBrought(row)
        ? row.broughtOnSite
        : broughtNumber
          ? String(broughtNumber)
          : "",
      broughtTouched: hasExplicitBrought(row),
      materialLeft: sum([broughtNumber, -amount(row.materialUsed)]),
    }
  })
}

export function getMaterialAnalysisRows(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const requested = bulkMaterialRequest.getDashboardLinesForDayIds(
    projectId,
    bulkMaterialRequest.getDayIds(projectId)
  )
  const received = materialReceipts.getDashboardLinesForDayIds(
    projectId,
    materialReceipts.getDayIds(projectId)
  )
  const tagged = [
    ...requested.map((line) => ({ ...line, side: "request" })),
    ...received.map((line) => ({ ...line, side: "received" })),
  ]

  return groupBySimilarDescription(tagged, (line) => line.description)
    .map((group, index) => {
      let requestedQuantity = 0
      let requestCost = 0
      let receivedQuantity = 0
      for (const item of group.items) {
        if (item.side === "request") {
          requestedQuantity = sum([requestedQuantity, item.quantity])
          requestCost = money(requestCost + money(item.totalCost))
        } else if (item.side === "received") {
          receivedQuantity = sum([receivedQuantity, item.quantity])
        }
      }
      const materialLeft = sum([requestedQuantity, -receivedQuantity])
      const unitPrice = requestedQuantity ? money(requestCost / requestedQuantity) : 0
      const receivedCost = money(receivedQuantity * unitPrice)
      const leftCost = money(materialLeft * unitPrice)
      return {
        id: `analysis-${index}`,
        description: group.description,
        requestedQuantity,
        receivedQuantity,
        materialLeft,
        requestCost,
        receivedCost,
        leftCost,
      }
    })
    .filter(
      (row) => row.requestedQuantity !== 0 || row.receivedQuantity !== 0 || row.materialLeft !== 0
    )
    .sort((left, right) => left.description.localeCompare(right.description))
}
