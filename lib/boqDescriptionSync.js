/**
 * When a BOQ / Rate build-up activity description is renamed, rewrite that
 * description everywhere the project uses it (valuations, memory, BOQ items).
 */

import {
  getProjectBoqs,
  normalizeBoqDescription,
  updateProjectBoqItems,
} from "@/lib/boqData"
import {
  isGrandTotalRow,
  isPlantSubRow,
  readActualCostAnalysisRows,
  saveActualCostAnalysisRows,
} from "@/lib/actualCostAnalysis"
import { MATERIAL_SCHEDULE_STORAGE_KEY } from "@/lib/materialSchedule"
import { RATE_BUILD_UP_MEMORY_KEY } from "@/lib/rateBuildUpMemory"
import { flushGroveStoreSnapshot } from "@/lib/groveClientStore"
import { createLocalStorageCache } from "@/lib/storageCache"
import { rememberMaterialScheduleDescriptions } from "@/lib/boqDescriptionMemory"

const materialScheduleStore = createLocalStorageCache(MATERIAL_SCHEDULE_STORAGE_KEY, {})
const rateBuildUpMemoryStore = createLocalStorageCache(RATE_BUILD_UP_MEMORY_KEY, {})

function sameBoqItem(row, { boqId, boqItemId }) {
  if (!boqId || !boqItemId) return false
  const rowBoqId = String(row?.boqId ?? "").trim()
  const rowItemId = String(row?.boqItemId ?? row?.id ?? "").trim()
  return rowBoqId === String(boqId) && rowItemId === String(boqItemId)
}

function matchesOldDescription(value, oldKey) {
  return Boolean(oldKey) && normalizeBoqDescription(value) === oldKey
}

function renameInRateBuildUp(projectId, { oldKey, newDescription, boqId, boqItemId }) {
  const rows = readActualCostAnalysisRows(projectId)
  if (!rows.length) return false

  let changed = false
  const renamedParentIds = new Set()

  const next = rows.map((row) => {
    if (isPlantSubRow(row) || isGrandTotalRow(row)) return row

    const byId = sameBoqItem(row, { boqId, boqItemId })
    const byText = matchesOldDescription(row.activityDescription, oldKey)
    if (!byId && !byText) return row

    changed = true
    if (row.id) renamedParentIds.add(row.id)
    return {
      ...row,
      activityDescription: newDescription,
      ...(boqId ? { boqId } : {}),
      ...(boqItemId ? { boqItemId } : {}),
    }
  })

  const withKids = next.map((row) => {
    if (!isPlantSubRow(row) && !isGrandTotalRow(row)) return row
    if (!row.parentId || !renamedParentIds.has(row.parentId)) return row
    changed = true
    return { ...row, activityDescription: isGrandTotalRow(row) ? "Grand total" : newDescription }
  })

  if (changed) {
    saveActualCostAnalysisRows(projectId, withKids, { remember: true, syncBoq: false })
  }
  return changed
}

function renameInBoqItems(projectId, { oldKey, newDescription, boqId, boqItemId }) {
  let changed = false
  for (const boq of getProjectBoqs(projectId)) {
    if (boqId && boq.id !== boqId) continue
    let boqChanged = false
    const items = (boq.items ?? []).map((item) => {
      const itemId = String(item.boqItemId ?? item.id ?? "")
      const byId = boqItemId && itemId === String(boqItemId)
      const byText = matchesOldDescription(item.itemName, oldKey)
      if (!byId && !byText) return item
      boqChanged = true
      changed = true
      return { ...item, itemName: newDescription }
    })
    if (boqChanged) updateProjectBoqItems(projectId, boq.id, items)
  }
  return changed
}

function renameInMaterialSchedules(projectId, { oldKey, newDescription, boqId, boqItemId }) {
  const store = materialScheduleStore.read() || {}
  const prefix = `${projectId}::`
  const keys = Object.keys(store).filter((key) => key.startsWith(prefix) && !key.endsWith("::meta"))
  let changed = false
  const remembered = []

  for (const key of keys) {
    const raw = Array.isArray(store[key]) ? store[key] : []
    let keyChanged = false
    const nextRows = raw.map((row) => {
      const byId = sameBoqItem(row, { boqId, boqItemId })
      const byText = matchesOldDescription(row.activityDescription, oldKey)
      if (!byId && !byText) return row
      keyChanged = true
      changed = true
      remembered.push(newDescription)
      return { ...row, activityDescription: newDescription }
    })
    if (keyChanged) store[key] = nextRows
  }

  if (changed) {
    materialScheduleStore.write(store)
    rememberMaterialScheduleDescriptions(projectId, remembered)
  }
  return changed
}

function renameInRateBuildUpMemory(projectId, { oldKey, newDescription }) {
  if (!projectId || !oldKey) return false
  const store = rateBuildUpMemoryStore.read() || {}
  const bucket = store[projectId]
  if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) return false
  if (!bucket[oldKey]) return false

  const nextBucket = { ...bucket }
  const entry = { ...nextBucket[oldKey], text: newDescription }
  delete nextBucket[oldKey]
  const newKey = normalizeBoqDescription(newDescription)
  if (newKey) nextBucket[newKey] = entry
  store[projectId] = nextBucket
  rateBuildUpMemoryStore.write(store)
  return true
}

/**
 * Rename one activity description across BOQ, Rate build-up, valuations, and memory.
 * Prefer matching by boqId + boqItemId; fall back to normalized description text.
 */
export function renameActivityDescriptionEverywhere(
  projectId,
  { oldDescription, newDescription, boqId = "", boqItemId = "", skipBoq = false, skipRateBuildUp = false } = {}
) {
  if (!projectId || typeof window === "undefined") return { changed: false }

  const nextText = String(newDescription ?? "").trim()
  const previousText = String(oldDescription ?? "").trim()
  if (!nextText || !previousText) return { changed: false }
  if (normalizeBoqDescription(nextText) === normalizeBoqDescription(previousText)) {
    return { changed: false }
  }

  const oldKey = normalizeBoqDescription(previousText)
  const args = { oldKey, newDescription: nextText, boqId, boqItemId }

  const rateChanged = skipRateBuildUp ? false : renameInRateBuildUp(projectId, args)
  const boqChanged = skipBoq ? false : renameInBoqItems(projectId, args)
  const scheduleChanged = renameInMaterialSchedules(projectId, args)
  const memoryChanged = renameInRateBuildUpMemory(projectId, args)

  if (rateChanged || boqChanged || scheduleChanged || memoryChanged) {
    flushGroveStoreSnapshot()
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("grove-shared-storage-change"))
    }
  }

  return {
    changed: rateChanged || boqChanged || scheduleChanged || memoryChanged,
    rateChanged,
    boqChanged,
    scheduleChanged,
    memoryChanged,
  }
}

/**
 * After BOQ template save, detect renamed item names (same item id) and propagate.
 */
export function propagateBoqItemDescriptionEdits(projectId, previousItems, nextItems) {
  if (!projectId || typeof window === "undefined") return 0
  const previousById = new Map(
    (previousItems ?? []).map((item) => [String(item.boqItemId ?? item.id ?? ""), item])
  )
  let count = 0
  for (const item of nextItems ?? []) {
    const id = String(item.boqItemId ?? item.id ?? "")
    if (!id) continue
    const previous = previousById.get(id)
    if (!previous) continue
    const oldDescription = String(previous.itemName ?? "").trim()
    const newDescription = String(item.itemName ?? "").trim()
    if (!oldDescription || !newDescription) continue
    if (normalizeBoqDescription(oldDescription) === normalizeBoqDescription(newDescription)) continue

    const result = renameActivityDescriptionEverywhere(projectId, {
      oldDescription,
      newDescription,
      boqId: item.boqId || previous.boqId || "",
      boqItemId: id,
      skipBoq: true, // caller already saved BOQ items
    })
    if (result.changed) count += 1
  }
  return count
}
