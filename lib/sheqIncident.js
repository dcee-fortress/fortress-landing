import { createLocalStorageCache } from "@/lib/storageCache"
import { getGroveItem } from "@/lib/groveClientStore"
import { getTodayDayId } from "@/lib/dailyFiles"
import { toPhotoMetadata } from "@/lib/progressReportPhotos"
import { releaseSheqAlertQuotaForIncidentDay } from "@/lib/sheqHomeAlerts"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"

export const SHEQ_INCIDENT_STORAGE_KEY = "grove-sheq-incident"

export const SHEQ_INCIDENT_TYPES = [
  { value: "injury", label: "Injury" },
  { value: "illness", label: "Illness" },
  { value: "near-miss", label: "Near miss" },
  { value: "property-damage", label: "Property damage" },
]

export const SHEQ_INCIDENT_YES_NO = [
  { value: "", label: "Select…" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]

const store = createLocalStorageCache(SHEQ_INCIDENT_STORAGE_KEY, {})

const DELETED_DAYS_KEY = "__deletedDays__"
/** Explicit + button creations only — never filled from project calendar / valuations. */
const MANUAL_FILES_KEY = "__manualIncidentFiles__"
const LEGACY_CREATED_KEY = "__createdDailyFiles__"
/** V2 kept some legacy day ids; V3 keeps only +button ids (`YYYY-MM-DD__stamp`). */
const MANUAL_MODE_FLAG = "__incidentManualModeV3__"
const MANUAL_MODE_FLAG_V2 = "__incidentManualModeV2__"
/**
 * Per-file sync clocks so deletes cannot be resurrected by an older remote
 * manual list, and trash restores cannot be re-deleted by an older tombstone.
 * File is alive when activeAt > deletedAt.
 */
const FILE_EPOCH_KEY = "__incidentFileEpoch__"

/** Legacy: `YYYY-MM-DD`. Multi-file: `YYYY-MM-DD__<timestamp>`. */
const INCIDENT_FILE_ID_RE = /^\d{4}-\d{2}-\d{2}(?:__[\w-]+)?$/

function reportKey(projectId, fileId) {
  return `${projectId}::daily::${fileId}`
}

function isIncidentFileId(id) {
  return INCIDENT_FILE_ID_RE.test(String(id || ""))
}

export function parseSheqIncidentFileId(fileId) {
  const raw = String(fileId || "")
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:__(.+))?$/)
  if (!match) {
    return { dayId: raw, stamp: "", fileId: raw }
  }
  return { dayId: match[1], stamp: match[2] || "", fileId: raw }
}

function createIncidentFileId(dayId = getTodayDayId()) {
  return `${dayId}__${Date.now()}`
}

/** True only for files created via the black + button (never plain calendar day ids). */
function isPlusCreatedIncidentId(fileId) {
  return /^\d{4}-\d{2}-\d{2}__[\w-]+$/.test(String(fileId || ""))
}

function readBlob() {
  const fromCache = store.read()
  if (fromCache && typeof fromCache === "object" && Object.keys(fromCache).length > 0) {
    return { ...fromCache }
  }
  const raw = getGroveItem(SHEQ_INCIDENT_STORAGE_KEY)
  if (!raw) return { ...(fromCache && typeof fromCache === "object" ? fromCache : {}) }
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? { ...parsed } : {}
  } catch {
    return {}
  }
}

function readIdList(blob, metaKey, projectId) {
  const bucket = blob?.[metaKey]
  if (!bucket || typeof bucket !== "object") return []
  const ids = bucket[projectId]
  return Array.isArray(ids) ? ids.map(String).filter(isIncidentFileId) : []
}

function writeIdList(blob, metaKey, projectId, ids) {
  return {
    ...blob,
    [metaKey]: {
      ...(blob[metaKey] && typeof blob[metaKey] === "object" ? blob[metaKey] : {}),
      [projectId]: [...ids].sort((a, b) => String(b).localeCompare(String(a))),
    },
  }
}

function readFileEpochBucket(blob, projectId) {
  const root = blob?.[FILE_EPOCH_KEY]
  if (!root || typeof root !== "object") return {}
  const bucket = root[projectId]
  return bucket && typeof bucket === "object" ? { ...bucket } : {}
}

function readFileEpoch(blob, projectId, fileId) {
  const entry = readFileEpochBucket(blob, projectId)[fileId]
  if (!entry || typeof entry !== "object") {
    return { activeAt: 0, deletedAt: 0 }
  }
  return {
    activeAt: Number(entry.activeAt) || 0,
    deletedAt: Number(entry.deletedAt) || 0,
  }
}

function isFileAlive(blob, projectId, fileId) {
  const { activeAt, deletedAt } = readFileEpoch(blob, projectId, fileId)
  // Legacy rows with no epoch: treat listed+not-deleted as alive.
  if (!activeAt && !deletedAt) {
    return !readIdList(blob, DELETED_DAYS_KEY, projectId).includes(fileId)
  }
  // Strict inequality: restore must beat the tombstone clock.
  return activeAt > deletedAt
}

function writeFileEpoch(blob, projectId, fileId, patch) {
  const bucket = readFileEpochBucket(blob, projectId)
  const prev = readFileEpoch(blob, projectId, fileId)
  bucket[fileId] = {
    activeAt: patch.activeAt !== undefined ? patch.activeAt : prev.activeAt,
    deletedAt: patch.deletedAt !== undefined ? patch.deletedAt : prev.deletedAt,
  }
  return {
    ...blob,
    [FILE_EPOCH_KEY]: {
      ...(blob[FILE_EPOCH_KEY] && typeof blob[FILE_EPOCH_KEY] === "object"
        ? blob[FILE_EPOCH_KEY]
        : {}),
      [projectId]: bucket,
    },
  }
}

function reportHasEnteredContent(report) {
  if (!report || typeof report !== "object") return false
  if (Array.isArray(report.photos) && report.photos.length > 0) return true
  return Boolean(
    (report.injuredName || "").trim() ||
      (report.locationOnSite || "").trim() ||
      (report.incidentType || "").trim() ||
      (report.description || "").trim() ||
      (report.witnessNames || "").trim() ||
      (report.bodyPartOrSymptoms || "").trim() ||
      (report.firstAidGiven || "").trim() ||
      (report.hospitalReferral || "").trim() ||
      (report.reportedBy || "").trim()
  )
}

function formatIncidentTimeLabel(isoOrStamp) {
  if (!isoOrStamp) return ""
  let date = null
  if (/^\d{13}$/.test(String(isoOrStamp))) {
    date = new Date(Number(isoOrStamp))
  } else {
    const parsed = new Date(isoOrStamp)
    if (Number.isFinite(parsed.getTime())) date = parsed
  }
  if (!date || !Number.isFinite(date.getTime())) return ""
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

/** Incident list row — independent of valuations / project calendar daily files. */
function buildIncidentFile(fileId, report = null) {
  const { dayId, stamp } = parseSheqIncidentFileId(fileId)
  const today = getTodayDayId()
  const dayLabel = formatDayLabelFromId(dayId) || dayId
  const timeLabel =
    formatIncidentTimeLabel(report?.createdAt) || formatIncidentTimeLabel(stamp)
  return {
    id: fileId,
    dayId,
    label: timeLabel ? `${dayLabel} · ${timeLabel}` : dayLabel,
    date: dayId,
    createdAt: report?.createdAt || "",
    completedAt: "Awaiting entry",
    awaitingEntry: true,
    isToday: dayId === today,
  }
}

export function createEmptySheqIncidentReport(fileId, defaults = {}) {
  const { dayId } = parseSheqIncidentFileId(fileId)
  return {
    fileId,
    dayId,
    injuredName: defaults.injuredName || "",
    locationOnSite: defaults.locationOnSite || "",
    incidentType: defaults.incidentType || "",
    description: defaults.description || "",
    witnessNames: defaults.witnessNames || "",
    bodyPartOrSymptoms: defaults.bodyPartOrSymptoms || "",
    firstAidGiven: defaults.firstAidGiven || "",
    hospitalReferral: defaults.hospitalReferral || "",
    reportedBy: defaults.reportedBy || "",
    photos: [],
    createdAt: defaults.createdAt || "",
    updatedAt: "",
  }
}

export function getSheqIncidentReport(projectId, fileId, defaults = {}) {
  if (typeof window === "undefined" || !projectId || !fileId) {
    return createEmptySheqIncidentReport(fileId, defaults)
  }

  const raw = readBlob()[reportKey(projectId, fileId)]
  if (!raw || typeof raw !== "object") {
    return createEmptySheqIncidentReport(fileId, defaults)
  }

  const { dayId } = parseSheqIncidentFileId(fileId)
  return {
    ...createEmptySheqIncidentReport(fileId),
    ...raw,
    fileId,
    dayId: raw.dayId || dayId,
    injuredName: raw.injuredName ?? "",
    locationOnSite: raw.locationOnSite ?? "",
    incidentType: raw.incidentType ?? "",
    description: raw.description ?? "",
    witnessNames: raw.witnessNames ?? "",
    bodyPartOrSymptoms: raw.bodyPartOrSymptoms ?? "",
    firstAidGiven: raw.firstAidGiven ?? "",
    hospitalReferral: raw.hospitalReferral ?? "",
    reportedBy: raw.reportedBy ?? "",
    photos: Array.isArray(raw.photos) ? raw.photos.map(toPhotoMetadata) : [],
    createdAt: raw.createdAt || "",
  }
}

export function saveSheqIncidentReport(projectId, fileId, report) {
  if (typeof window === "undefined" || !projectId || !fileId) {
    return Promise.resolve()
  }

  const blob = readBlob()
  // Never revive a deleted file via autosave.
  if (!isFileAlive(blob, projectId, fileId)) {
    return Promise.resolve()
  }

  const existing = getSheqIncidentReport(projectId, fileId)
  const nextReport = {
    ...createEmptySheqIncidentReport(fileId),
    ...report,
    fileId,
    dayId: parseSheqIncidentFileId(fileId).dayId,
    photos: Array.isArray(report?.photos) ? report.photos.map(toPhotoMetadata) : [],
    createdAt: report?.createdAt || existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  let next = {
    ...blob,
    [reportKey(projectId, fileId)]: nextReport,
  }
  const manual = new Set(readIdList(next, MANUAL_FILES_KEY, projectId))
  if (manual.has(fileId)) {
    const deleted = new Set(readIdList(next, DELETED_DAYS_KEY, projectId))
    deleted.delete(fileId)
    next = writeIdList(next, DELETED_DAYS_KEY, projectId, deleted)
  }

  return store.write(next, { replace: false })
}

export function hasSheqIncidentData(projectId, fileId) {
  return reportHasEnteredContent(getSheqIncidentReport(projectId, fileId))
}

export function getSheqIncidentDeletedDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  return readIdList(readBlob(), DELETED_DAYS_KEY, projectId)
}

export function isSheqIncidentDayDeleted(projectId, fileId) {
  if (!projectId || !fileId) return true
  if (typeof window === "undefined") return false
  return !isFileAlive(readBlob(), projectId, fileId)
}

/**
 * Cleanup: drop legacy calendar / Sunday default stubs. Only +button file ids
 * (`YYYY-MM-DD__stamp`) remain. Empty +created files are kept so the user can
 * fill them in; plain day ids are always removed from the list.
 */
export async function migrateSheqIncidentToManualOnly(projectId) {
  if (typeof window === "undefined" || !projectId) return false

  const blob = readBlob()
  const flags = blob[MANUAL_MODE_FLAG]
  if (flags && typeof flags === "object" && flags[projectId]) {
    // Still prune any plain calendar ids that sync may have reintroduced.
    const manual = readIdList(blob, MANUAL_FILES_KEY, projectId)
    const cleaned = manual.filter(isPlusCreatedIncidentId)
    if (cleaned.length === manual.length) return false
    let next = writeIdList(blob, MANUAL_FILES_KEY, projectId, cleaned)
    next = writeIdList(next, LEGACY_CREATED_KEY, projectId, [])
    await store.write(next, { replace: false })
    return true
  }

  const prefix = `${projectId}::daily::`
  let next = { ...blob }
  const keepManual = []
  const dropIds = new Set()

  const listed = new Set([
    ...readIdList(next, MANUAL_FILES_KEY, projectId),
    ...readIdList(next, LEGACY_CREATED_KEY, projectId),
  ])

  for (const key of Object.keys(next)) {
    if (!key.startsWith(prefix)) continue
    const fileId = key.slice(prefix.length)
    if (!isIncidentFileId(fileId)) continue
    listed.add(fileId)
  }

  const now = Date.now()
  for (const fileId of listed) {
    const key = reportKey(projectId, fileId)
    if (isPlusCreatedIncidentId(fileId) && isFileAlive(next, projectId, fileId)) {
      keepManual.push(fileId)
      continue
    }
    dropIds.add(fileId)
    if (key in next) delete next[key]
    next = writeFileEpoch(next, projectId, fileId, {
      activeAt: readFileEpoch(next, projectId, fileId).activeAt,
      deletedAt: Math.max(now, readFileEpoch(next, projectId, fileId).activeAt + 1),
    })
  }

  const deleted = new Set(readIdList(next, DELETED_DAYS_KEY, projectId))
  for (const fileId of dropIds) deleted.add(fileId)

  next = writeIdList(next, MANUAL_FILES_KEY, projectId, keepManual)
  next = writeIdList(next, DELETED_DAYS_KEY, projectId, deleted)
  next = writeIdList(next, LEGACY_CREATED_KEY, projectId, [])
  if (next.__incidentManualModeV1__ && typeof next.__incidentManualModeV1__ === "object") {
    const v1 = { ...next.__incidentManualModeV1__ }
    delete v1[projectId]
    next.__incidentManualModeV1__ = v1
  }
  if (next[MANUAL_MODE_FLAG_V2] && typeof next[MANUAL_MODE_FLAG_V2] === "object") {
    const v2 = { ...next[MANUAL_MODE_FLAG_V2] }
    delete v2[projectId]
    next[MANUAL_MODE_FLAG_V2] = v2
  }
  next[MANUAL_MODE_FLAG] = {
    ...(next[MANUAL_MODE_FLAG] && typeof next[MANUAL_MODE_FLAG] === "object"
      ? next[MANUAL_MODE_FLAG]
      : {}),
    [projectId]: true,
  }

  await store.write(next, { replace: false })
  return true
}

/**
 * Ensures every deleted id has a tombstone clock newer than its active clock,
 * and removes deleted ids from the manual list so sync cannot revive them.
 */
export async function sealSheqIncidentDeletes(projectId) {
  if (typeof window === "undefined" || !projectId) return false

  let next = readBlob()
  const deleted = new Set(readIdList(next, DELETED_DAYS_KEY, projectId))
  const manual = new Set(readIdList(next, MANUAL_FILES_KEY, projectId))
  let changed = false
  const now = Date.now()

  for (const fileId of [...manual]) {
    if (!isPlusCreatedIncidentId(fileId) || !isFileAlive(next, projectId, fileId)) {
      manual.delete(fileId)
      deleted.add(fileId)
      changed = true
    }
  }

  for (const fileId of deleted) {
    const ep = readFileEpoch(next, projectId, fileId)
    const needTombstone = !(ep.deletedAt > ep.activeAt)
    if (needTombstone) {
      next = writeFileEpoch(next, projectId, fileId, {
        activeAt: ep.activeAt,
        deletedAt: Math.max(now, ep.activeAt + 1, ep.deletedAt + 1),
      })
      changed = true
    }
    if (manual.has(fileId)) {
      manual.delete(fileId)
      changed = true
    }
    const key = reportKey(projectId, fileId)
    if (key in next) {
      delete next[key]
      changed = true
    }
  }

  if (!changed) return false

  next = writeIdList(next, MANUAL_FILES_KEY, projectId, manual)
  next = writeIdList(next, DELETED_DAYS_KEY, projectId, deleted)
  await store.write(next, { replace: false })
  return true
}

/**
 * Manual list only — files appear solely after the user presses +.
 * Multiple files may share the same calendar day.
 */
export function getSheqIncidentDailyFiles(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const blob = readBlob()
  const manual = readIdList(blob, MANUAL_FILES_KEY, projectId)
  return [...new Set(manual)]
    .filter((id) => isPlusCreatedIncidentId(id) && isFileAlive(blob, projectId, id))
    .sort((a, b) => String(b).localeCompare(String(a)))
    .map((fileId) => buildIncidentFile(fileId, blob[reportKey(projectId, fileId)]))
}

export function getSheqIncidentDailyFile(projectId, fileId) {
  if (!projectId || !fileId || isSheqIncidentDayDeleted(projectId, fileId)) return null
  if (typeof window === "undefined") return null
  return getSheqIncidentDailyFiles(projectId).find((file) => file.id === fileId) ?? null
}

export function getSheqIncidentEntryStatus(projectId, file) {
  const hasData = hasSheqIncidentData(projectId, file.id)
  if (hasData) {
    return {
      key: "in-progress",
      label: "Saved",
      description: "Incident report saved — you can still edit",
    }
  }
  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for incident report entry",
  }
}

/**
 * Creates a new incident file for today. Always adds another file — same-day
 * duplicates are allowed.
 */
export async function createSheqIncidentDailyFileForToday(projectId) {
  if (typeof window === "undefined" || !projectId) {
    return { ok: false, message: "Missing project." }
  }

  await migrateSheqIncidentToManualOnly(projectId)

  const dayId = getTodayDayId()
  const fileId = createIncidentFileId(dayId)
  const createdAt = new Date().toISOString()
  const now = Date.now()
  let blob = readBlob()
  const deleted = new Set(readIdList(blob, DELETED_DAYS_KEY, projectId))
  const manual = new Set(readIdList(blob, MANUAL_FILES_KEY, projectId))

  deleted.delete(fileId)
  manual.add(fileId)

  let next = writeIdList(blob, MANUAL_FILES_KEY, projectId, manual)
  next = writeIdList(next, DELETED_DAYS_KEY, projectId, deleted)
  next = writeIdList(next, LEGACY_CREATED_KEY, projectId, [])
  next = writeFileEpoch(next, projectId, fileId, { activeAt: now, deletedAt: 0 })
  next[reportKey(projectId, fileId)] = createEmptySheqIncidentReport(fileId, { createdAt })

  await store.write(next, { replace: false })
  return {
    ok: true,
    dayId,
    fileId,
    alreadyExists: false,
    file: buildIncidentFile(fileId, next[reportKey(projectId, fileId)]),
  }
}

/**
 * Deletes the file from the list. Alerts from this file restore to weekly quota.
 * Alerts that are not deleted expire after 24 hours on their own.
 */
export async function deleteSheqIncidentDay(projectId, fileId) {
  if (typeof window === "undefined" || !projectId || !fileId) {
    return { ok: false, message: "Missing project or file." }
  }

  const key = reportKey(projectId, fileId)
  const blob = readBlob()
  const report = blob[key] && typeof blob[key] === "object" ? blob[key] : null
  const { addTrashEntry, TRASH_ENTRY_TYPES } = await import("@/lib/fileTrash")
  const { getProjectById } = await import("@/lib/projectList")
  const file = buildIncidentFile(fileId, report)

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.SHEQ_INCIDENT_DAILY,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId: fileId,
    label: file.label,
    snapshot: { report },
  })

  await releaseSheqAlertQuotaForIncidentDay(projectId, fileId)

  let next = { ...blob }
  delete next[key]

  const deleted = new Set(readIdList(next, DELETED_DAYS_KEY, projectId))
  deleted.add(fileId)
  next = writeIdList(next, DELETED_DAYS_KEY, projectId, deleted)

  const manual = new Set(readIdList(next, MANUAL_FILES_KEY, projectId))
  manual.delete(fileId)
  next = writeIdList(next, MANUAL_FILES_KEY, projectId, manual)

  const legacy = new Set(readIdList(next, LEGACY_CREATED_KEY, projectId))
  legacy.delete(fileId)
  next = writeIdList(next, LEGACY_CREATED_KEY, projectId, legacy)

  // Tombstone must be newer than any prior activeAt so sync cannot resurrect.
  const prev = readFileEpoch(next, projectId, fileId)
  next = writeFileEpoch(next, projectId, fileId, {
    activeAt: prev.activeAt,
    deletedAt: Math.max(Date.now(), prev.activeAt + 1, prev.deletedAt + 1),
  })

  await store.write(next, { replace: false })
  return { ok: true }
}

export async function restoreSheqIncidentDayFromTrash(entry) {
  if (!entry?.projectId || !entry?.dayId) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  const fileId = entry.dayId
  let next = { ...readBlob() }
  const key = reportKey(entry.projectId, fileId)
  const report = entry.snapshot?.report
  if (report && typeof report === "object") {
    next[key] = report
  }

  const deleted = new Set(readIdList(next, DELETED_DAYS_KEY, entry.projectId))
  deleted.delete(fileId)
  next = writeIdList(next, DELETED_DAYS_KEY, entry.projectId, deleted)

  const manual = new Set(readIdList(next, MANUAL_FILES_KEY, entry.projectId))
  manual.add(fileId)
  next = writeIdList(next, MANUAL_FILES_KEY, entry.projectId, manual)

  const prev = readFileEpoch(next, entry.projectId, fileId)
  next = writeFileEpoch(next, entry.projectId, fileId, {
    activeAt: Math.max(Date.now(), prev.deletedAt + 1, prev.activeAt + 1),
    deletedAt: prev.deletedAt,
  })

  await store.write(next, { replace: false })
  return { ok: true }
}
