import { createLocalStorageCache } from "@/lib/storageCache"
import { getGroveItem } from "@/lib/groveClientStore"
import { dayIdFromDate, parseDayId } from "@/lib/dailyFiles"
import { addDays, getWeekBoundsForDay, weekIdFromStart } from "@/lib/weeklyFiles"
import { getProjectById } from "@/lib/projectList"
import { getWeeklyFiles } from "@/lib/projectFiles"
import {
  getSheqIncidentDailyFiles,
  getSheqIncidentReport,
  parseSheqIncidentFileId,
} from "@/lib/sheqIncident"
import { getSheqSiteInspectionReport } from "@/lib/sheqSiteInspection"

export const SHEQ_WEEKLY_REPORT_STORAGE_KEY = "grove-sheq-weekly-report"

const store = createLocalStorageCache(SHEQ_WEEKLY_REPORT_STORAGE_KEY, {})
const DELETED_FILES_KEY = "__deletedFiles__"

function deletedFileToken(variant, weekId) {
  return `${variant === "target" ? "target" : "actual"}::${weekId}`
}

function readDeletedFileTokens(blob, projectId) {
  const bucket = blob?.[DELETED_FILES_KEY]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.map(String) : []
}

export const SHEQ_WEEKLY_TRAINING_COLUMNS = [
  { field: "trainingTopic", label: "Training topic", placeholder: "Training topic" },
  {
    field: "participants",
    label: "Number of participants",
    placeholder: "0",
    align: "right",
    inputMode: "numeric",
  },
  { field: "date", label: "Date", placeholder: "Date" },
  {
    field: "totalManpower",
    label: "Total Manpower",
    placeholder: "0",
    align: "right",
    inputMode: "numeric",
  },
]

export const SHEQ_WEEKLY_INCIDENT_SUMMARY_ROWS = [
  { key: "recordedIncidents", description: "Recorded number of incidents" },
  { key: "firstAidCases", description: "First aid cases" },
  { key: "lostTimeInjuries", description: "Lost time of injuries" },
  { key: "nearMissReports", description: "Near miss reports" },
  { key: "unsafeActsObserved", description: "Unsafe acts observed" },
]

function readBlob() {
  const fromCache = store.read()
  if (fromCache && typeof fromCache === "object" && Object.keys(fromCache).length > 0) {
    return { ...fromCache }
  }
  const raw = getGroveItem(SHEQ_WEEKLY_REPORT_STORAGE_KEY)
  if (!raw) return { ...(fromCache && typeof fromCache === "object" ? fromCache : {}) }
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? { ...parsed } : {}
  } catch {
    return {}
  }
}

export const MAJOR_HIGHLIGHT_DOCUMENT_HTML =
  "<h2>Major Highlight</h2><p><br></p>"

function reportKey(projectId, weekId, variant = "actual") {
  const kind = variant === "target" ? "weekly-target" : "weekly"
  return `${projectId}::${kind}::${weekId}`
}

function createRowId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `sheq-train-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyTrainingRow() {
  return {
    id: createRowId(),
    trainingTopic: "",
    participants: "",
    date: "",
    totalManpower: "",
  }
}

export function createEmptySheqWeeklyReport(weekId, defaults = {}) {
  const variant = defaults.variant === "target" ? "target" : "actual"
  return {
    weekId,
    variant,
    projectName: defaults.projectName || "",
    trainingRows: variant === "actual" ? [createEmptyTrainingRow()] : [],
    incidentSummary: {},
    documentHtml: variant === "actual" ? MAJOR_HIGHLIGHT_DOCUMENT_HTML : "",
    updatedAt: "",
  }
}

function weekDayBounds(weekId) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekId || ""))) return null
  try {
    const weekStart = parseDayId(weekId)
    const weekEnd = addDays(weekStart, 6)
    return {
      weekStart,
      weekEnd,
      startId: weekId,
      endId: dayIdFromDate(weekEnd),
    }
  } catch {
    return null
  }
}

function dayIdInWeek(dayId, weekId) {
  const bounds = weekDayBounds(weekId)
  if (!bounds || !/^\d{4}-\d{2}-\d{2}$/.test(String(dayId || ""))) return false
  return dayId >= bounds.startId && dayId <= bounds.endId
}

function textLooksLikeUnsafeAct(...parts) {
  const text = parts.map((part) => String(part || "")).join(" ").toLowerCase()
  return /unsafe\s*act/.test(text) || /\bunsafe\b/.test(text)
}

function textLooksLikeLostTime(...parts) {
  const text = parts.map((part) => String(part || "")).join(" ").toLowerCase()
  return /lost\s*time|l\.?t\.?i\.?\b|lost\s*time\s*injur/.test(text)
}

function textLooksLikeFirstAid(...parts) {
  const text = parts.map((part) => String(part || "")).join(" ").toLowerCase()
  return /first\s*aid/.test(text)
}

function textLooksLikeNearMiss(...parts) {
  const text = parts.map((part) => String(part || "")).join(" ").toLowerCase()
  return /near\s*miss/.test(text)
}

function countInspectionMatches(projectId, weekId, matcher) {
  if (typeof window === "undefined" || !projectId || !weekId) return 0
  let count = 0

  const weekly = getSheqSiteInspectionReport(projectId, "weekly", weekId)
  for (const row of weekly.rows || []) {
    if (matcher(row.category, row.observation, row.recommendation)) count += 1
  }

  const bounds = weekDayBounds(weekId)
  if (!bounds) return count

  let cursor = new Date(bounds.weekStart)
  while (cursor <= bounds.weekEnd) {
    const dayId = dayIdFromDate(cursor)
    const daily = getSheqSiteInspectionReport(projectId, "daily", dayId)
    for (const row of daily.rows || []) {
      if (matcher(row.category, row.observation, row.recommendation)) count += 1
    }
    cursor = addDays(cursor, 1)
  }

  return count
}

/**
 * Auto incident summary for a project week — pulls from SHEQ incident reports
 * and site inspection rows that fall in that week.
 */
export function getSheqWeeklyIncidentSummary(projectId, weekId) {
  const empty = {
    recordedIncidents: 0,
    firstAidCases: 0,
    lostTimeInjuries: 0,
    nearMissReports: 0,
    unsafeActsObserved: 0,
  }

  if (typeof window === "undefined" || !projectId || !weekId) return empty

  const incidents = getSheqIncidentDailyFiles(projectId).filter((file) => {
    const { dayId } = parseSheqIncidentFileId(file.id)
    return dayIdInWeek(dayId, weekId)
  })

  let firstAidCases = 0
  let lostTimeInjuries = 0
  let nearMissReports = 0

  for (const file of incidents) {
    const report = getSheqIncidentReport(projectId, file.id)
    const type = String(report.incidentType || "").toLowerCase()
    const firstAid = String(report.firstAidGiven || "").toLowerCase()
    const hospital = String(report.hospitalReferral || "").trim()
    const description = String(report.description || "")

    if (firstAid === "yes" || textLooksLikeFirstAid(description, hospital)) {
      firstAidCases += 1
    }

    if (type === "near-miss" || textLooksLikeNearMiss(description)) {
      nearMissReports += 1
    }

    // Lost-time: injury with hospital referral, or explicit LTI wording.
    if (
      textLooksLikeLostTime(description, hospital, report.bodyPartOrSymptoms) ||
      (type === "injury" && hospital)
    ) {
      lostTimeInjuries += 1
    }
  }

  const unsafeFromInspection = countInspectionMatches(projectId, weekId, textLooksLikeUnsafeAct)
  const unsafeFromIncidents = incidents.reduce((sum, file) => {
    const report = getSheqIncidentReport(projectId, file.id)
    return textLooksLikeUnsafeAct(report.description, report.locationOnSite) ? sum + 1 : sum
  }, 0)

  return {
    recordedIncidents: incidents.length,
    firstAidCases,
    lostTimeInjuries,
    nearMissReports,
    unsafeActsObserved: unsafeFromInspection + unsafeFromIncidents,
  }
}

export function getSheqWeeklyIncidentSummaryLines(projectId, weekId, overrides = null) {
  const needsAuto = SHEQ_WEEKLY_INCIDENT_SUMMARY_ROWS.some(
    (row) => !(overrides && Object.prototype.hasOwnProperty.call(overrides, row.key))
  )
  const counts = needsAuto ? getSheqWeeklyIncidentSummary(projectId, weekId) : null
  return SHEQ_WEEKLY_INCIDENT_SUMMARY_ROWS.map((row) => {
    const hasOverride =
      overrides && Object.prototype.hasOwnProperty.call(overrides, row.key)
    return {
      key: row.key,
      description: row.description,
      cases: hasOverride
        ? String(overrides[row.key] ?? "")
        : String(counts?.[row.key] ?? 0),
    }
  })
}

function normalizeIncidentSummary(raw) {
  if (!raw || typeof raw !== "object") return {}
  const out = {}
  for (const row of SHEQ_WEEKLY_INCIDENT_SUMMARY_ROWS) {
    if (Object.prototype.hasOwnProperty.call(raw, row.key)) {
      out[row.key] = String(raw[row.key] ?? "")
    }
  }
  return out
}

export function getSheqWeeklyReportDeletedWeekIds(projectId, variant = "actual") {
  if (typeof window === "undefined" || !projectId) return []
  const prefix = `${variant === "target" ? "target" : "actual"}::`
  return readDeletedFileTokens(readBlob(), projectId)
    .filter((token) => token.startsWith(prefix))
    .map((token) => token.slice(prefix.length))
}

export function getSheqWeeklyReportFiles(projectId, variant = "actual") {
  if (typeof window === "undefined" || !projectId) return []
  const deleted = new Set(getSheqWeeklyReportDeletedWeekIds(projectId, variant))
  return getWeeklyFiles(projectId).filter((file) => !deleted.has(file.id))
}

export function getSheqWeeklyReportFile(projectId, weekId, variant = "actual") {
  if (!projectId || !weekId) return null
  return getSheqWeeklyReportFiles(projectId, variant).find((file) => file.id === weekId) ?? null
}

export function getSheqWeeklyReport(projectId, weekId, defaults = {}) {
  const variant = defaults.variant === "target" ? "target" : "actual"
  if (typeof window === "undefined" || !projectId || !weekId) {
    return createEmptySheqWeeklyReport(weekId, { ...defaults, variant })
  }

  const raw = readBlob()[reportKey(projectId, weekId, variant)]
  if (!raw || typeof raw !== "object") {
    return createEmptySheqWeeklyReport(weekId, {
      projectName: defaults.projectName || getProjectById(projectId)?.name || "",
      variant,
    })
  }

  const trainingRows = Array.isArray(raw.trainingRows)
    ? raw.trainingRows.map((row) => ({
        id: row.id || createRowId(),
        trainingTopic: String(row.trainingTopic ?? ""),
        participants: row.participants ?? "",
        date: String(row.date ?? ""),
        totalManpower: row.totalManpower ?? "",
      }))
    : variant === "actual"
      ? [createEmptyTrainingRow()]
      : []

  let documentHtml = String(raw.documentHtml || "")
  if (variant === "actual" && !documentHtml.trim()) {
    documentHtml = MAJOR_HIGHLIGHT_DOCUMENT_HTML
  }

  return {
    weekId,
    variant,
    projectName: String(raw.projectName || defaults.projectName || ""),
    trainingRows:
      variant === "actual"
        ? trainingRows.length > 0
          ? trainingRows
          : [createEmptyTrainingRow()]
        : [],
    incidentSummary: variant === "actual" ? normalizeIncidentSummary(raw.incidentSummary) : {},
    documentHtml,
    updatedAt: String(raw.updatedAt || ""),
  }
}

function trainingRowHasEntry(row) {
  if (!row || typeof row !== "object") return false
  return Boolean(
    String(row.trainingTopic || "").trim() ||
      String(row.participants || "").trim() ||
      String(row.date || "").trim() ||
      String(row.totalManpower || "").trim()
  )
}

export async function saveSheqWeeklyReport(projectId, weekId, report) {
  if (typeof window === "undefined" || !projectId || !weekId) return

  const variant = report?.variant === "target" ? "target" : "actual"
  const key = reportKey(projectId, weekId, variant)
  const next = { ...readBlob() }
  const trainingRows =
    variant === "actual"
      ? (Array.isArray(report?.trainingRows) ? report.trainingRows : [])
          .map((row) => ({
            id: row.id || createRowId(),
            trainingTopic: String(row.trainingTopic ?? ""),
            participants: row.participants ?? "",
            date: String(row.date ?? ""),
            totalManpower: row.totalManpower ?? "",
          }))
          .filter(trainingRowHasEntry)
      : []

  next[key] = {
    weekId,
    variant,
    projectName: String(report?.projectName || getProjectById(projectId)?.name || ""),
    trainingRows:
      variant === "actual"
        ? trainingRows.length > 0
          ? trainingRows
          : [createEmptyTrainingRow()]
        : [],
    incidentSummary:
      variant === "actual" ? normalizeIncidentSummary(report?.incidentSummary) : {},
    documentHtml: String(report?.documentHtml || ""),
    updatedAt: new Date().toISOString(),
  }

  await store.write(next, { replace: false })
}

/**
 * Clears this weekly SHEQ report and hides it from the list.
 * Snapshot kept in Settings → Recycle files for 90 days.
 */
export async function deleteSheqWeeklyReportFile(projectId, weekId, variant = "actual", label) {
  if (typeof window === "undefined" || !projectId || !weekId) {
    return { ok: false, message: "Missing project or week." }
  }

  const kind = variant === "target" ? "target" : "actual"
  const key = reportKey(projectId, weekId, kind)
  const blob = readBlob()
  const report = blob[key] && typeof blob[key] === "object" ? blob[key] : null
  const { addTrashEntry, TRASH_ENTRY_TYPES } = await import("@/lib/fileTrash")

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.SHEQ_WEEKLY_REPORT,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId: deletedFileToken(kind, weekId),
    label: label || weekId,
    snapshot: {
      weekId,
      variant: kind,
      report,
    },
  })

  const next = { ...blob }
  delete next[key]
  const deleted = new Set(readDeletedFileTokens(next, projectId))
  deleted.add(deletedFileToken(kind, weekId))
  next[DELETED_FILES_KEY] = {
    ...(next[DELETED_FILES_KEY] && typeof next[DELETED_FILES_KEY] === "object"
      ? next[DELETED_FILES_KEY]
      : {}),
    [projectId]: [...deleted].sort(),
  }

  await store.write(next, { replace: false })
  return { ok: true }
}

export async function restoreSheqWeeklyReportFromTrash(entry) {
  const weekId = entry?.snapshot?.weekId
  const variant = entry?.snapshot?.variant === "target" ? "target" : "actual"
  if (!entry?.projectId || !weekId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  const next = { ...readBlob() }
  const key = reportKey(entry.projectId, weekId, variant)
  const report = entry.snapshot?.report
  if (report && typeof report === "object") {
    next[key] = report
  }

  const deleted = new Set(readDeletedFileTokens(next, entry.projectId))
  deleted.delete(deletedFileToken(variant, weekId))
  next[DELETED_FILES_KEY] = {
    ...(next[DELETED_FILES_KEY] && typeof next[DELETED_FILES_KEY] === "object"
      ? next[DELETED_FILES_KEY]
      : {}),
    [entry.projectId]: [...deleted].sort(),
  }

  await store.write(next, { replace: false })
  return { ok: true }
}

/** Resolve project week id for a calendar day (for tooling / tests). */
export function getProjectWeekIdForDay(projectId, dayId) {
  const project = getProjectById(projectId)
  if (!project?.startDate || !dayId) return null
  try {
    const bounds = getWeekBoundsForDay(parseDayId(dayId), parseDayId(project.startDate))
    if (!bounds) return null
    return weekIdFromStart(bounds.weekStart)
  } catch {
    return null
  }
}
