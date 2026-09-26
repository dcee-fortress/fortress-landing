import { createLocalStorageCache } from "@/lib/storageCache"
import { getGroveItem } from "@/lib/groveClientStore"
import { invalidateGroveCaches } from "@/lib/invalidateGroveCaches"
import { invalidateMaterialScheduleCaches } from "@/lib/materialSchedule"
import {
  invalidateProjectDataCache,
  PROJECT_DATA_STORAGE_KEY,
} from "@/lib/projectData"
import { PLANT_COST_STORAGE_KEY } from "@/lib/plantCostData"
import { PLANT_HOURS_STORAGE_KEY } from "@/lib/plantHoursData"
import { EQUIPMENT_HOURS_STORAGE_KEY } from "@/lib/equipmentHoursData"
import {
  MATERIAL_SCHEDULE_STORAGE_KEY,
  MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY,
} from "@/lib/materialSchedule"
import {
  readProjectsRegistry,
  writeProjectsRegistry,
} from "@/lib/projectRegistry"
import { getMonthIdForDay } from "@/lib/periodFiles"
import { parseDayId } from "@/lib/dailyFiles"
import {
  getPlantOperatorRegisterData,
  savePlantOperatorRegisterData,
} from "@/lib/plantOperatorRegisterData"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import { getProjectById } from "@/lib/projectList"

export const FILE_TRASH_STORAGE_KEY = "grove-file-trash"
export const TRASH_RETENTION_DAYS = 90

export const TRASH_ENTRY_TYPES = {
  VALUATION_DAILY: "valuation-daily",
  PETTY_CASH_DAILY: "petty-cash-daily",
  GOODS_RECEIVED_DAILY: "goods-received-daily",
  GOODS_ACQUIRED_DAILY: "goods-acquired-daily",
  PPE_RECEIVED_DAILY: "ppe-received-daily",
  PPE_ISSUED_DAILY: "ppe-issued-daily",
  SHEQ_SITE_INSPECTION: "sheq-site-inspection",
  SHEQ_INCIDENT_DAILY: "sheq-incident-daily",
  SHEQ_WEEKLY_REPORT: "sheq-weekly-report",
}

const trashStore = createLocalStorageCache(FILE_TRASH_STORAGE_KEY, { entries: [] })

function createTrashId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `trash-${crypto.randomUUID()}`
  }
  return `trash-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function readJsonStore(storageKey) {
  if (typeof window === "undefined") return {}
  try {
    const raw = getGroveItem(storageKey)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function writeJsonStore(storageKey, store) {
  const { writeGroveJson } = await import("@/lib/saveToPostgres")
  return writeGroveJson(storageKey, store, { replace: true })
}

function addDaysIso(iso, days) {
  const date = new Date(iso)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function isExpired(entry, now = Date.now()) {
  if (!entry?.expiresAt) return false
  return new Date(entry.expiresAt).getTime() <= now
}

function readEntries() {
  const store = trashStore.read()
  return Array.isArray(store?.entries) ? store.entries : []
}

async function writeEntries(entries) {
  return trashStore.write({ entries })
}

export function getTrashTypeLabel(type) {
  switch (type) {
    case TRASH_ENTRY_TYPES.PETTY_CASH_DAILY:
      return "Petty cash"
    case TRASH_ENTRY_TYPES.GOODS_RECEIVED_DAILY:
      return "Goods received"
    case TRASH_ENTRY_TYPES.GOODS_ACQUIRED_DAILY:
      return "Goods acquired"
    case TRASH_ENTRY_TYPES.PPE_RECEIVED_DAILY:
      return "PPE received"
    case TRASH_ENTRY_TYPES.PPE_ISSUED_DAILY:
      return "PPE issued"
    case TRASH_ENTRY_TYPES.SHEQ_SITE_INSPECTION:
      return "SHEQ site inspection"
    case TRASH_ENTRY_TYPES.SHEQ_INCIDENT_DAILY:
      return "SHEQ incident"
    case TRASH_ENTRY_TYPES.SHEQ_WEEKLY_REPORT:
      return "SHEQ weekly report"
    case TRASH_ENTRY_TYPES.VALUATION_DAILY:
    default:
      return "Valuations"
  }
}

export function purgeExpiredTrashEntries() {
  if (typeof window === "undefined") return []
  const now = Date.now()
  const entries = readEntries()
  const kept = []
  const expired = []

  for (const entry of entries) {
    if (isExpired(entry, now)) expired.push(entry)
    else kept.push(entry)
  }

  if (expired.length > 0) {
    void writeEntries(kept)
    for (const entry of expired) {
      void permanentlyDiscardSnapshotAssets(entry)
    }
  }

  return kept
}

export function listTrashEntries() {
  if (typeof window === "undefined") return []
  return purgeExpiredTrashEntries()
    .slice()
    .sort((left, right) => String(right.deletedAt).localeCompare(String(left.deletedAt)))
}

export async function addTrashEntry(entry) {
  if (typeof window === "undefined" || !entry) return null
  const deletedAt = entry.deletedAt || new Date().toISOString()
  const next = {
    id: entry.id || createTrashId(),
    type: entry.type || TRASH_ENTRY_TYPES.VALUATION_DAILY,
    projectId: entry.projectId,
    projectName: entry.projectName || getProjectById(entry.projectId)?.name || "Project",
    dayId: entry.dayId,
    label: entry.label || formatDayLabelFromId(entry.dayId) || entry.dayId,
    deletedAt,
    expiresAt: entry.expiresAt || addDaysIso(deletedAt, TRASH_RETENTION_DAYS),
    snapshot: entry.snapshot || {},
  }

  const entries = readEntries().filter(
    (item) =>
      !(
        item.projectId === next.projectId &&
        item.dayId === next.dayId &&
        item.type === next.type
      )
  )
  entries.unshift(next)
  await writeEntries(entries)
  return next
}

function collectMaterialScheduleSnapshot(projectId, dayId) {
  const prefix = `${projectId}::${dayId}::`
  const schedules = {}
  const drafts = {}
  const scheduleStore = readJsonStore(MATERIAL_SCHEDULE_STORAGE_KEY)
  const draftStore = readJsonStore(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY)

  for (const [key, value] of Object.entries(scheduleStore)) {
    if (key.startsWith(prefix)) schedules[key] = value
  }
  for (const [key, value] of Object.entries(draftStore)) {
    if (key.startsWith(prefix)) drafts[key] = value
  }

  return { schedules, drafts }
}

function collectKeyedDaySnapshot(storageKey, projectId, dayId) {
  const projectStore = readJsonStore(storageKey)?.[projectId]
  if (!projectStore || typeof projectStore !== "object") return null
  if (Object.prototype.hasOwnProperty.call(projectStore, dayId)) {
    return projectStore[dayId]
  }
  if (Object.prototype.hasOwnProperty.call(projectStore, `daily:${dayId}`)) {
    return projectStore[`daily:${dayId}`]
  }
  return null
}

function collectRegisterAttendanceSnapshot(projectId, dayId) {
  const monthId = getMonthIdForDay(dayId)
  if (!monthId) return null
  const dayKey = String(parseDayId(dayId).getDate())
  const register = getPlantOperatorRegisterData(projectId, monthId)
  const attendanceByRowId = {}

  for (const row of register.rows || []) {
    if (!row?.id) continue
    const value = row.attendance?.[dayKey]
    if (value != null) attendanceByRowId[row.id] = value
  }

  return {
    monthId,
    dayKey,
    attendanceByRowId,
  }
}

export function buildValuationDailyTrashSnapshot(projectId, dayId) {
  const registry = readProjectsRegistry()
  const projectFiles = registry.files?.[projectId] ?? {}
  const dailyFile = (projectFiles.daily ?? []).find((file) => file?.id === dayId)
  const progressReport = (projectFiles.dailyProgressReports ?? []).find(
    (report) => report?.id === dayId
  )
  const projectData = readJsonStore(PROJECT_DATA_STORAGE_KEY)?.[projectId]?.[dayId] ?? null

  return {
    dailyFile: dailyFile || { id: dayId, label: formatDayLabelFromId(dayId) },
    projectData,
    materialSchedules: collectMaterialScheduleSnapshot(projectId, dayId),
    plantCost: collectKeyedDaySnapshot(PLANT_COST_STORAGE_KEY, projectId, dayId),
    plantHours: collectKeyedDaySnapshot(PLANT_HOURS_STORAGE_KEY, projectId, dayId),
    equipmentHours: collectKeyedDaySnapshot(EQUIPMENT_HOURS_STORAGE_KEY, projectId, dayId),
    registerAttendance: collectRegisterAttendanceSnapshot(projectId, dayId),
    progressReport: progressReport || null,
  }
}

async function restoreKeyedDay(storageKey, projectId, dayId, value) {
  if (value == null) return
  const store = { ...readJsonStore(storageKey) }
  const projectStore = { ...(store[projectId] ?? {}) }
  projectStore[dayId] = value
  delete projectStore[`daily:${dayId}`]
  store[projectId] = projectStore
  await writeJsonStore(storageKey, store)
}

async function restoreMaterialSchedules(snapshot) {
  const schedules = snapshot?.schedules || {}
  const drafts = snapshot?.drafts || {}
  if (Object.keys(schedules).length === 0 && Object.keys(drafts).length === 0) return

  const scheduleStore = { ...readJsonStore(MATERIAL_SCHEDULE_STORAGE_KEY), ...schedules }
  const draftStore = { ...readJsonStore(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY), ...drafts }
  await Promise.all([
    writeJsonStore(MATERIAL_SCHEDULE_STORAGE_KEY, scheduleStore),
    writeJsonStore(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY, draftStore),
  ])
}

async function restoreRegisterAttendance(projectId, snapshot) {
  if (!snapshot?.monthId || !snapshot?.dayKey) return
  const register = getPlantOperatorRegisterData(projectId, snapshot.monthId)
  const attendanceByRowId = snapshot.attendanceByRowId || {}
  const nextRows = (register.rows || []).map((row) => {
    if (!row?.id || !(row.id in attendanceByRowId)) return row
    return {
      ...row,
      attendance: {
        ...(row.attendance || {}),
        [snapshot.dayKey]: attendanceByRowId[row.id],
      },
    }
  })
  savePlantOperatorRegisterData(projectId, snapshot.monthId, {
    ...register,
    rows: nextRows,
  })
}

async function restoreValuationDailyFromTrash(entry) {
  const { projectId, dayId, snapshot } = entry
  if (!projectId || !dayId || !snapshot) {
    return { ok: false, message: "Trash entry is incomplete." }
  }

  if (snapshot.projectData != null) {
    const store = { ...readJsonStore(PROJECT_DATA_STORAGE_KEY) }
    const projectStore = { ...(store[projectId] ?? {}) }
    projectStore[dayId] = snapshot.projectData
    store[projectId] = projectStore
    await writeJsonStore(PROJECT_DATA_STORAGE_KEY, store)
  }

  await restoreMaterialSchedules(snapshot.materialSchedules)
  await restoreKeyedDay(PLANT_COST_STORAGE_KEY, projectId, dayId, snapshot.plantCost)
  await restoreKeyedDay(PLANT_HOURS_STORAGE_KEY, projectId, dayId, snapshot.plantHours)
  await restoreKeyedDay(EQUIPMENT_HOURS_STORAGE_KEY, projectId, dayId, snapshot.equipmentHours)
  await restoreRegisterAttendance(projectId, snapshot.registerAttendance)

  const registry = readProjectsRegistry()
  const projectFiles = registry.files?.[projectId] ?? {
    daily: [],
    weekly: [],
    monthly: [],
    progressReports: [],
    weeklyProgressReports: [],
    dailyProgressReports: [],
    deletedDailyIds: [],
  }

  const daily = [...(projectFiles.daily ?? [])]
  if (!daily.some((file) => file?.id === dayId)) {
    daily.push(snapshot.dailyFile || { id: dayId, label: entry.label || dayId })
    daily.sort((left, right) => String(right.id).localeCompare(String(left.id)))
  }

  const dailyProgressReports = [...(projectFiles.dailyProgressReports ?? [])].filter(
    (report) => report?.id !== dayId
  )
  if (snapshot.progressReport) {
    dailyProgressReports.push(snapshot.progressReport)
    dailyProgressReports.sort((left, right) => String(right.id).localeCompare(String(left.id)))
  }

  registry.files = {
    ...(registry.files ?? {}),
    [projectId]: {
      ...projectFiles,
      daily,
      dailyProgressReports,
      deletedDailyIds: (projectFiles.deletedDailyIds ?? []).filter((id) => id !== dayId),
    },
  }

  await writeProjectsRegistry(registry)
  return { ok: true }
}

async function permanentlyDiscardSnapshotAssets(entry) {
  const photoIds = []

  const report = entry?.snapshot?.progressReport
  if (report) {
    photoIds.push(
      ...(Array.isArray(report?.progressUpdate?.photos)
        ? report.progressUpdate.photos.map((photo) => photo?.id).filter(Boolean)
        : []),
      ...(Array.isArray(report?.photos)
        ? report.photos.map((photo) => photo?.id).filter(Boolean)
        : [])
    )
  }

  if (Array.isArray(entry?.snapshot?.receipts)) {
    photoIds.push(...entry.snapshot.receipts.map((photo) => photo?.id).filter(Boolean))
  }

  if (photoIds.length === 0) return

  try {
    const { removeStoredProgressPhoto } = await import("@/lib/progressReportPhotos")
    await Promise.all(photoIds.map((id) => removeStoredProgressPhoto(id)))
  } catch {
    // Best-effort.
  }
}

export async function restoreTrashEntry(entryId) {
  if (typeof window === "undefined" || !entryId) {
    return { ok: false, message: "Missing trash entry." }
  }

  const entries = listTrashEntries()
  const entry = entries.find((item) => item.id === entryId)
  if (!entry) return { ok: false, message: "Trash entry not found." }

  if (entry.type === TRASH_ENTRY_TYPES.PETTY_CASH_DAILY) {
    const { restorePettyCashDayFromTrash } = await import("@/lib/pettyCash")
    const result = await restorePettyCashDayFromTrash(entry)
    if (!result.ok) return result
  } else if (entry.type === TRASH_ENTRY_TYPES.GOODS_RECEIVED_DAILY) {
    const { restoreGoodsReceivedDayFromTrash } = await import("@/lib/goodsReceived")
    const result = await restoreGoodsReceivedDayFromTrash(entry)
    if (!result.ok) return result
  } else if (entry.type === TRASH_ENTRY_TYPES.GOODS_ACQUIRED_DAILY) {
    const { restoreGoodsAcquiredDayFromTrash } = await import("@/lib/goodsAcquired")
    const result = await restoreGoodsAcquiredDayFromTrash(entry)
    if (!result.ok) return result
  } else if (entry.type === TRASH_ENTRY_TYPES.PPE_RECEIVED_DAILY) {
    const { restorePpeReceivedDayFromTrash } = await import("@/lib/ppeReceived")
    const result = await restorePpeReceivedDayFromTrash(entry)
    if (!result.ok) return result
  } else if (entry.type === TRASH_ENTRY_TYPES.PPE_ISSUED_DAILY) {
    const { restorePpeIssuedDayFromTrash } = await import("@/lib/ppeIssued")
    const result = await restorePpeIssuedDayFromTrash(entry)
    if (!result.ok) return result
  } else if (entry.type === TRASH_ENTRY_TYPES.SHEQ_SITE_INSPECTION) {
    const { restoreSheqSiteInspectionFromTrash } = await import("@/lib/sheqSiteInspection")
    const result = await restoreSheqSiteInspectionFromTrash(entry)
    if (!result.ok) return result
  } else if (entry.type === TRASH_ENTRY_TYPES.SHEQ_WEEKLY_REPORT) {
    const { restoreSheqWeeklyReportFromTrash } = await import("@/lib/sheqWeeklyReport")
    const result = await restoreSheqWeeklyReportFromTrash(entry)
    if (!result.ok) return result
  } else if (entry.type === TRASH_ENTRY_TYPES.SHEQ_INCIDENT_DAILY) {
    const { restoreSheqIncidentDayFromTrash } = await import("@/lib/sheqIncident")
    const result = await restoreSheqIncidentDayFromTrash(entry)
    if (!result.ok) return result
  } else {
    const result = await restoreValuationDailyFromTrash(entry)
    if (!result.ok) return result
  }

  await writeEntries(entries.filter((item) => item.id !== entryId))
  invalidateProjectDataCache()
  invalidateMaterialScheduleCaches()
  invalidateGroveCaches()
  return { ok: true }
}

export async function permanentlyDeleteTrashEntry(entryId) {
  if (typeof window === "undefined" || !entryId) {
    return { ok: false, message: "Missing trash entry." }
  }

  const entries = listTrashEntries()
  const entry = entries.find((item) => item.id === entryId)
  if (!entry) return { ok: false, message: "Trash entry not found." }

  await permanentlyDiscardSnapshotAssets(entry)
  await writeEntries(entries.filter((item) => item.id !== entryId))
  invalidateGroveCaches()
  return { ok: true }
}

export function daysRemainingInTrash(entry, now = Date.now()) {
  if (!entry?.expiresAt) return TRASH_RETENTION_DAYS
  const ms = new Date(entry.expiresAt).getTime() - now
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
