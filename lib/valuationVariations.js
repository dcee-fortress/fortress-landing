import {
  getActualCostAnalysisRate,
  resolveActualCostAnalysisRow,
} from "@/lib/actualCostAnalysis"
import { normalizeBoqDescription } from "@/lib/boqData"
import { createLocalStorageCache } from "@/lib/storageCache"
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"

export const VALUATION_VARIATIONS_STORAGE_KEY = "grove-valuation-variations"

const storeCache = createLocalStorageCache(VALUATION_VARIATIONS_STORAGE_KEY, {})

function readStore() {
  const store = storeCache.read()
  return store && typeof store === "object" ? store : {}
}

function writeStore(store) {
  const pending = storeCache.write(store)
  markSharedStorageLocalWrite(VALUATION_VARIATIONS_STORAGE_KEY)
  if (typeof window !== "undefined") {
    const notify = () => window.dispatchEvent(new Event("grove-shared-storage-change"))
    if (pending && typeof pending.then === "function") pending.then(notify, notify)
    else notify()
  }
  return pending
}

function projectList(projectId) {
  const list = readStore()[projectId]
  return Array.isArray(list) ? list : []
}

function saveProjectList(projectId, list) {
  if (!projectId || typeof window === "undefined") return Promise.resolve()
  const store = readStore()
  store[projectId] = list
  return writeStore(store)
}

export function createVariationId() {
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function listValuationVariations(projectId) {
  if (!projectId) return []
  return projectList(projectId)
    .slice()
    .sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")))
}

export function getValuationVariation(projectId, variationId) {
  return listValuationVariations(projectId).find((item) => item.id === variationId) || null
}

export function listPendingValuationVariations(projectId) {
  return listValuationVariations(projectId).filter((item) => item.status === "pending")
}

export function getApprovedVariationForDay(projectId, dayId) {
  if (!projectId || !dayId) return null
  return (
    listValuationVariations(projectId).find(
      (item) => item.dayId === dayId && item.status === "approved"
    ) || null
  )
}

/** Actual rate for a description on a day: approved variation wins for that day only. */
export function getEffectiveActualRate(projectId, dayId, description) {
  if (!projectId || typeof window === "undefined") return null
  const needle = normalizeBoqDescription(description)
  if (!needle) return null

  const approved = getApprovedVariationForDay(projectId, dayId)
  if (approved) {
    const row = (approved.rows || []).find(
      (item) => normalizeBoqDescription(item.activityDescription) === needle
    )
    if (row) {
      const rate = resolveActualCostAnalysisRow(row).rate
      if (rate != null) return rate
    }
  }

  return getActualCostAnalysisRate(projectId, description)
}

export function submitValuationVariation(projectId, { dayId, slotId, rows, note = "" }) {
  if (!projectId || !dayId || typeof window === "undefined") return Promise.resolve(null)

  const variation = {
    id: createVariationId(),
    dayId,
    slotId: slotId || "",
    status: "pending",
    note: String(note || "").trim(),
    submittedAt: new Date().toISOString(),
    decidedAt: null,
    rows: Array.isArray(rows) ? rows : [],
  }

  const next = [variation, ...projectList(projectId).filter((item) => item.id !== variation.id)]
  return saveProjectList(projectId, next).then(() => variation)
}

export function decideValuationVariation(projectId, variationId, status) {
  if (!projectId || !variationId || typeof window === "undefined") return Promise.resolve(null)
  if (status !== "approved" && status !== "rejected") return Promise.resolve(null)

  const list = projectList(projectId)
  const index = list.findIndex((item) => item.id === variationId)
  if (index < 0) return Promise.resolve(null)

  const current = list[index]
  const updated = {
    ...current,
    status,
    decidedAt: new Date().toISOString(),
  }

  // Only one approved variation per day.
  const next = list.map((item, i) => {
    if (i === index) return updated
    if (
      status === "approved" &&
      item.dayId === current.dayId &&
      item.status === "approved" &&
      item.id !== variationId
    ) {
      return { ...item, status: "superseded", decidedAt: new Date().toISOString() }
    }
    return item
  })

  return saveProjectList(projectId, next).then(() => updated)
}

export function getVariationReviewHref(projectId, variationId) {
  return `/project/${projectId}/dashboard/qs-overview/variations/${variationId}`
}

export function getValuationsVariationsEntryHref(projectId, dayId, slotId, scheduleType) {
  return `/project/${projectId}/dashboard/daily-value/${dayId}/hourly/${slotId}/material-schedule/${scheduleType}/variations`
}
