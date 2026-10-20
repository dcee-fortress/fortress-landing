import { getTodayDayId } from "@/lib/dailyFiles"
import { bulkMaterialRequest, materialReceipts } from "@/lib/materialRegister"
import {
  parsePlantCostAmount,
  roundMaterialAmount,
  roundMaterialUnitPrice,
} from "@/lib/plantCostCalculations"
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

function prepareRow(row) {
  return {
    id: row?.id || newRowId(),
    description: String(row?.description ?? ""),
    stock: row?.stock ?? "",
    stockFormula: String(row?.stockFormula ?? ""),
    materialUsed: row?.materialUsed ?? "",
    materialUsedFormula: String(row?.materialUsedFormula ?? ""),
  }
}

function rowHasEntry(row) {
  return Boolean(String(row?.description || "").trim() || amount(row?.stock) || amount(row?.materialUsed))
}

function readRawRows(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) return []
  const raw = readStore()[dayKey(projectId, dayId)]
  return Array.isArray(raw) ? raw.map(prepareRow).filter(rowHasEntry) : []
}

export function getMaterialSiteDailyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = readStore()
  const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
  return readIdList(store, MANUAL_FILES_KEY, projectId)
    .filter((dayId) => !deleted.has(dayId))
    .map(buildFile)
}

export function getMaterialSiteDailyFile(projectId, dayId) {
  if (!projectId || !dayId) return null
  return getMaterialSiteDailyFiles(projectId).find((file) => file.id === dayId) ?? null
}

export async function createMaterialSiteFileForToday(projectId) {
  if (typeof window === "undefined" || !projectId) return { ok: false, message: "Missing project." }
  const dayId = getTodayDayId()
  let store = { ...readStore() }
  const deleted = new Set(readIdList(store, DELETED_DAYS_KEY, projectId))
  const manual = new Set(readIdList(store, MANUAL_FILES_KEY, projectId))
  if (manual.has(dayId) && !deleted.has(dayId)) {
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
    stock: amount(row.stock),
    used: amount(row.materialUsed),
    kind: "manual",
  }))
}

function relevantDayIds(projectId, extraDayId) {
  const ids = new Set(materialReceipts.getDayIds(projectId))
  for (const file of getMaterialSiteDailyFiles(projectId)) {
    if (readRawRows(projectId, file.id).length > 0) ids.add(file.id)
  }
  if (DAY_ID.test(String(extraDayId || ""))) ids.add(extraDayId)
  return [...ids].sort()
}

function sum(values) {
  return values.reduce((total, value) => roundMaterialAmount(total + value) ?? total, 0)
}

function replay(projectId, throughDayId) {
  const snapshots = new Map()
  let running = []

  for (const dayId of relevantDayIds(projectId, throughDayId)) {
    if (throughDayId && dayId > throughDayId) break
    const tagged = [
      ...running
        .filter((item) => item.left !== 0)
        .map((item) => ({ description: item.description, opening: item.left, kind: "opening" })),
      ...receivedLinesForDay(projectId, dayId),
      ...manualLinesForDay(projectId, dayId),
    ]
    const groups = groupBySimilarDescription(tagged, (item) => item.description)
    const nextRunning = []
    const lines = []

    for (const group of groups) {
      let opening = 0
      let received = 0
      let stock = 0
      let materialUsed = 0
      for (const item of group.items) {
        if (item.kind === "opening") opening = sum([opening, item.opening])
        if (item.kind === "received") received = sum([received, item.received])
        if (item.kind === "manual") {
          stock = sum([stock, item.stock])
          materialUsed = sum([materialUsed, item.used])
        }
      }
      const storeroom = sum([opening, received, stock])
      const materialLeft = sum([storeroom, -materialUsed])
      if (storeroom !== 0 || materialUsed !== 0 || materialLeft !== 0) {
        lines.push({
          id: `site-${dayId}-${lines.length}`,
          description: group.description,
          opening,
          received,
          stock,
          storeroom,
          materialUsed,
          materialLeft,
        })
      }
      if (materialLeft !== 0) nextRunning.push({ description: group.description, left: materialLeft })
    }

    for (const previous of running) {
      if (!groups.some((group) => descriptionsMatch(group.description, previous.description))) {
        nextRunning.push(previous)
      }
    }

    running = nextRunning
    snapshots.set(dayId, lines)
  }

  return { snapshots, running }
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

  for (const lines of snapshots.values()) {
    for (const line of lines) {
      totals.push({
        description: line.description,
        received: line.received,
        stock: line.stock,
        materialUsed: line.materialUsed,
      })
    }
  }

  return groupBySimilarDescription(totals, (line) => line.description)
    .map((group, index) => {
      const received = sum(group.items.map((item) => item.received))
      const stock = sum(group.items.map((item) => item.stock))
      const materialUsed = sum(group.items.map((item) => item.materialUsed))
      const storeroom = sum([received, stock])
      return {
        id: `site-project-${index}`,
        description: group.description,
        storeroom,
        materialUsed,
        materialLeft: sum([storeroom, -materialUsed]),
      }
    })
    .filter((line) => line.storeroom !== 0 || line.materialUsed !== 0 || line.materialLeft !== 0)
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

function claimQuantity(pool, description) {
  const index = pool.findIndex((item) => !item.claimed && descriptionsMatch(item.description, description))
  if (index < 0) return 0
  pool[index] = { ...pool[index], claimed: true }
  return amount(pool[index].quantity)
}

export function getMaterialSiteEntryRows(projectId, dayId) {
  const saved = readRawRows(projectId, dayId)
  const movement = getMaterialSiteDashboardLines(projectId, dayId)
  const receivedPool = movement
    .filter((line) => line.received)
    .map((line) => ({ description: line.description, quantity: line.received, claimed: false }))
  const openingPool = movement
    .filter((line) => line.opening)
    .map((line) => ({ description: line.description, quantity: line.opening, claimed: false }))

  const seeds = saved.map((row) => ({ ...row, fromReceived: false }))
  for (const line of movement) {
    const described = String(line.description || "").trim()
    if (!described || described === "—") continue
    if (seeds.some((row) => descriptionsMatch(row.description, described))) continue
    if (!line.received && !line.opening) continue
    seeds.push({
      ...prepareRow({ id: `brought-${described.toLowerCase()}`, description: described }),
      fromReceived: line.received > 0,
    })
  }

  const rows = (seeds.length > 0 ? seeds : [prepareRow({})]).map((row) => {
    const receivedQuantity = claimQuantity(receivedPool, row.description)
    const openingQuantity = claimQuantity(openingPool, row.description)
    const stockQuantity = amount(row.stock)
    const usedQuantity = amount(row.materialUsed)
    return {
      ...row,
      receivedQuantity,
      openingQuantity,
      materialLeft: sum([openingQuantity, receivedQuantity, stockQuantity, -usedQuantity]),
    }
  })

  return rows
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
  const stock = getMaterialSiteProjectLines(projectId)
  const tagged = [
    ...requested.map((line) => ({ ...line, side: "request" })),
    ...received.map((line) => ({ ...line, side: "received" })),
    ...stock.map((line) => ({ ...line, side: "stock" })),
  ]

  return groupBySimilarDescription(tagged, (line) => line.description)
    .map((group, index) => {
      let requestedQuantity = 0
      let requestCost = 0
      let receivedQuantity = 0
      let materialLeft = 0
      for (const item of group.items) {
        if (item.side === "request") {
          requestedQuantity = sum([requestedQuantity, item.quantity])
          requestCost = money(requestCost + money(item.totalCost))
        } else if (item.side === "received") {
          receivedQuantity = sum([receivedQuantity, item.quantity])
        } else {
          materialLeft = sum([materialLeft, item.materialLeft])
        }
      }
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
