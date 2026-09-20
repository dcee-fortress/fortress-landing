import { createLocalStorageCache } from "@/lib/storageCache"
import { getGroveItem } from "@/lib/groveClientStore"
import { getDailyFiles, getMonthlyFiles, getWeeklyFiles } from "@/lib/projectFiles"
import { parseDayId } from "@/lib/dailyFiles"
import { releaseSheqAlertQuotaForInspectionFile } from "@/lib/sheqHomeAlerts"

export const SHEQ_SITE_INSPECTION_STORAGE_KEY = "grove-sheq-site-inspection"

const store = createLocalStorageCache(SHEQ_SITE_INSPECTION_STORAGE_KEY, {})

function readInspectionBlob() {
  const fromCache = store.read()
  if (fromCache && typeof fromCache === "object" && Object.keys(fromCache).length > 0) {
    return { ...fromCache }
  }
  const raw = getGroveItem(SHEQ_SITE_INSPECTION_STORAGE_KEY)
  if (!raw) return { ...(fromCache && typeof fromCache === "object" ? fromCache : {}) }
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? { ...parsed } : {}
  } catch {
    return {}
  }
}

export const SHEQ_SITE_INSPECTION_COLUMNS = [
  { field: "item", label: "Item", placeholder: "Item", width: "6rem" },
  { field: "category", label: "Category", placeholder: "Category" },
  { field: "observation", label: "Observation", placeholder: "Observation" },
  { field: "recommendation", label: "Recommendation", placeholder: "Recommendation" },
  { field: "responsibility", label: "Responsibility", placeholder: "Responsibility" },
]

export const SHEQ_SITE_INSPECTION_PERIODS = ["daily", "weekly", "monthly"]

function reportKey(projectId, period, periodId) {
  return `${projectId}::${period}::${periodId}`
}

function createRowId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `sheq-insp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyInspectionRow(itemNumber = 1) {
  return {
    id: createRowId(),
    item: String(itemNumber),
    category: "",
    observation: "",
    recommendation: "",
    responsibility: "",
  }
}

export function createEmptyInspectionReport(period, periodId, defaults = {}) {
  return {
    period,
    periodId,
    projectName: defaults.projectName || "",
    date: defaults.date || "",
    location: defaults.location || "",
    rows: [],
    // Empty until first save — keeps sync from treating placeholders as newer than real data.
    updatedAt: "",
  }
}

function defaultDateForPeriod(period, periodId) {
  if (period === "daily" && /^\d{4}-\d{2}-\d{2}$/.test(periodId)) {
    try {
      return parseDayId(periodId).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return periodId
    }
  }
  return periodId || ""
}

function normalizeRow(row, index) {
  return {
    id: row?.id || createRowId(),
    item: row?.item != null && String(row.item).trim() ? String(row.item) : String(index + 1),
    category: row?.category ?? "",
    observation: row?.observation ?? "",
    recommendation: row?.recommendation ?? "",
    responsibility: row?.responsibility ?? "",
  }
}

export function getSheqSiteInspectionReport(projectId, period, periodId, defaults = {}) {
  if (typeof window === "undefined" || !projectId || !period || !periodId) {
    return createEmptyInspectionReport(period, periodId, {
      ...defaults,
      date: defaults.date || defaultDateForPeriod(period, periodId),
    })
  }

  const raw = readInspectionBlob()[reportKey(projectId, period, periodId)]
  if (!raw || typeof raw !== "object") {
    return createEmptyInspectionReport(period, periodId, {
      projectName: defaults.projectName || "",
      date: defaults.date || defaultDateForPeriod(period, periodId),
      location: defaults.location || "",
    })
  }

  return {
    ...createEmptyInspectionReport(period, periodId),
    ...raw,
    period,
    periodId,
    projectName: raw.projectName ?? defaults.projectName ?? "",
    date: raw.date || defaults.date || defaultDateForPeriod(period, periodId),
    location: raw.location ?? "",
    rows: Array.isArray(raw.rows) ? raw.rows.map(normalizeRow) : [],
  }
}

export function saveSheqSiteInspectionReport(projectId, period, periodId, report) {
  if (typeof window === "undefined" || !projectId || !period || !periodId) {
    return Promise.resolve()
  }

  const next = {
    ...createEmptyInspectionReport(period, periodId),
    ...report,
    period,
    periodId,
    rows: Array.isArray(report?.rows) ? report.rows.map(normalizeRow) : [],
    updatedAt: new Date().toISOString(),
  }

  // Merge into the fullest local blob so saving one file cannot wipe others.
  const data = {
    ...readInspectionBlob(),
    [reportKey(projectId, period, periodId)]: next,
  }
  // Merge on the server (not full replace) so a thin local snapshot cannot erase
  // sibling reports already stored in Postgres.
  return store.write(data, { replace: false })
}

export function hasSheqSiteInspectionData(projectId, period, periodId) {
  const report = getSheqSiteInspectionReport(projectId, period, periodId)
  if ((report.location || "").trim()) return true
  return (report.rows || []).some(
    (row) =>
      (row.category || "").trim() ||
      (row.observation || "").trim() ||
      (row.recommendation || "").trim() ||
      (row.responsibility || "").trim()
  )
}

export function getSheqSiteInspectionPeriodFile(projectId, period, periodId) {
  return (
    getSheqSiteInspectionPeriodFiles(projectId, period).find((file) => file.id === periodId) ?? null
  )
}

export function getSheqSiteInspectionEntryStatus(projectId, period, file) {
  const hasData = hasSheqSiteInspectionData(projectId, period, file.id)
  if (hasData) {
    return {
      key: "in-progress",
      label: "Saved",
      description: "Inspection entries saved — you can still edit",
    }
  }
  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for site inspection entry",
  }
}

export function renumberInspectionItems(rows) {
  return (rows || []).map((row, index) => ({
    ...row,
    item: String(index + 1),
  }))
}

const DELETED_FILES_KEY = "__deletedFiles__"

function deletedFileToken(period, periodId) {
  return `${period}::${periodId}`
}

function readDeletedFileTokens(blob, projectId) {
  const bucket = blob?.[DELETED_FILES_KEY]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.map(String) : []
}

export function getSheqSiteInspectionDeletedFileIds(projectId, period) {
  if (typeof window === "undefined" || !projectId || !period) return []
  const prefix = `${period}::`
  return readDeletedFileTokens(readInspectionBlob(), projectId)
    .filter((token) => token.startsWith(prefix))
    .map((token) => token.slice(prefix.length))
}

export function getSheqSiteInspectionPeriodFiles(projectId, period) {
  const deleted = new Set(getSheqSiteInspectionDeletedFileIds(projectId, period))
  const files =
    period === "weekly"
      ? getWeeklyFiles(projectId)
      : period === "monthly"
        ? getMonthlyFiles(projectId)
        : getDailyFiles(projectId)
  return files.filter((file) => !deleted.has(file.id))
}

/**
 * Clears this inspection file and hides it from the list.
 * Snapshot kept in Settings → Recycle files for 90 days.
 * Alerts raised from this file restore to the weekly quota.
 */
export async function deleteSheqSiteInspectionFile(projectId, period, periodId, label) {
  if (typeof window === "undefined" || !projectId || !period || !periodId) {
    return { ok: false, message: "Missing project or file." }
  }

  const key = reportKey(projectId, period, periodId)
  const blob = readInspectionBlob()
  const report = blob[key] && typeof blob[key] === "object" ? blob[key] : null
  const { addTrashEntry, TRASH_ENTRY_TYPES } = await import("@/lib/fileTrash")
  const { getProjectById } = await import("@/lib/projectList")

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.SHEQ_SITE_INSPECTION,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId: deletedFileToken(period, periodId),
    label: label || periodId,
    snapshot: {
      period,
      periodId,
      report,
    },
  })

  await releaseSheqAlertQuotaForInspectionFile(projectId, period, periodId)

  const next = { ...blob }
  delete next[key]
  const deleted = new Set(readDeletedFileTokens(next, projectId))
  deleted.add(deletedFileToken(period, periodId))
  next[DELETED_FILES_KEY] = {
    ...(next[DELETED_FILES_KEY] && typeof next[DELETED_FILES_KEY] === "object"
      ? next[DELETED_FILES_KEY]
      : {}),
    [projectId]: [...deleted].sort(),
  }

  await store.write(next, { replace: false })
  return { ok: true }
}

export async function restoreSheqSiteInspectionFromTrash(entry) {
  const period = entry?.snapshot?.period
  const periodId = entry?.snapshot?.periodId
  if (!entry?.projectId || !period || !periodId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  const next = { ...readInspectionBlob() }
  const key = reportKey(entry.projectId, period, periodId)
  const report = entry.snapshot?.report
  if (report && typeof report === "object") {
    next[key] = report
  }

  const deleted = new Set(readDeletedFileTokens(next, entry.projectId))
  deleted.delete(deletedFileToken(period, periodId))
  next[DELETED_FILES_KEY] = {
    ...(next[DELETED_FILES_KEY] && typeof next[DELETED_FILES_KEY] === "object"
      ? next[DELETED_FILES_KEY]
      : {}),
    [entry.projectId]: [...deleted].sort(),
  }

  await store.write(next, { replace: false })
  return { ok: true }
}
