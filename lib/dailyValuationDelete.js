import { invalidateGroveCaches } from "@/lib/invalidateGroveCaches"
import { invalidateMaterialScheduleCaches } from "@/lib/materialSchedule"
import { getGroveItem } from "@/lib/groveClientStore"
import {
  readProjectsRegistry,
  writeProjectsRegistry,
} from "@/lib/projectRegistry"
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
import { getMonthIdForDay } from "@/lib/periodFiles"
import { parseDayId } from "@/lib/dailyFiles"
import {
  getPlantOperatorRegisterData,
  savePlantOperatorRegisterData,
} from "@/lib/plantOperatorRegisterData"

async function writeJsonStore(storageKey, store) {
  const { writeGroveJson } = await import("@/lib/saveToPostgres")
  return writeGroveJson(storageKey, store, { replace: true })
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

function removeMaterialSchedulesForDay(projectId, dayId) {
  const prefix = `${projectId}::${dayId}::`
  const store = readJsonStore(MATERIAL_SCHEDULE_STORAGE_KEY)
  const drafts = readJsonStore(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY)
  let changed = false

  for (const key of Object.keys(store)) {
    if (key.startsWith(prefix)) {
      delete store[key]
      changed = true
    }
  }

  for (const key of Object.keys(drafts)) {
    if (key.startsWith(prefix)) {
      delete drafts[key]
      changed = true
    }
  }

  if (!changed) return Promise.resolve()
  return Promise.all([
    writeJsonStore(MATERIAL_SCHEDULE_STORAGE_KEY, store),
    writeJsonStore(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY, drafts),
  ])
}

function removeDayFromKeyedProjectStore(storageKey, projectId, dayId) {
  const store = readJsonStore(storageKey)
  const projectStore = store[projectId]
  if (!projectStore || typeof projectStore !== "object") return Promise.resolve()

  let changed = false
  if (Object.prototype.hasOwnProperty.call(projectStore, dayId)) {
    delete projectStore[dayId]
    changed = true
  }
  if (Object.prototype.hasOwnProperty.call(projectStore, `daily:${dayId}`)) {
    delete projectStore[`daily:${dayId}`]
    changed = true
  }

  if (!changed) return Promise.resolve()
  store[projectId] = projectStore
  return writeJsonStore(storageKey, store)
}

function removeDayFromPrimaryProjectData(projectId, dayId) {
  const store = readJsonStore(PROJECT_DATA_STORAGE_KEY)
  const projectStore = store[projectId]
  if (!projectStore || typeof projectStore !== "object") return Promise.resolve()
  if (!Object.prototype.hasOwnProperty.call(projectStore, dayId)) return Promise.resolve()

  delete projectStore[dayId]
  store[projectId] = projectStore
  return writeJsonStore(PROJECT_DATA_STORAGE_KEY, store)
}

function clearPlantOperatorRegisterDay(projectId, dayId) {
  const monthId = getMonthIdForDay(dayId)
  if (!monthId) return Promise.resolve()

  const dayKey = String(parseDayId(dayId).getDate())
  const register = getPlantOperatorRegisterData(projectId, monthId)
  const rows = Array.isArray(register?.rows) ? register.rows : []
  if (rows.length === 0) return Promise.resolve()

  let changed = false
  const nextRows = rows.map((row) => {
    const attendance = { ...(row?.attendance ?? {}) }
    if (attendance[dayKey] == null) return row
    changed = true
    return {
      ...row,
      attendance: {
        ...attendance,
        [dayKey]: null,
      },
    }
  })

  if (!changed) return Promise.resolve()

  savePlantOperatorRegisterData(projectId, monthId, {
    ...register,
    rows: nextRows,
  })
  return Promise.resolve()
}

/**
 * Marks the daily valuation file deleted, removes the matching daily progress
 * report, and updates the registry in one write.
 */
function markDailyFileDeletedInRegistry(projectId, dayId) {
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

  const deletedDailyIds = [
    ...new Set([...(projectFiles.deletedDailyIds ?? []), dayId].filter(Boolean)),
  ]

  const dailyProgressReports = (projectFiles.dailyProgressReports ?? []).filter(
    (report) => report?.id !== dayId
  )

  registry.files = {
    ...(registry.files ?? {}),
    [projectId]: {
      ...projectFiles,
      deletedDailyIds,
      daily: (projectFiles.daily ?? []).filter((file) => file?.id !== dayId),
      dailyProgressReports,
    },
  }

  return writeProjectsRegistry(registry)
}

/**
 * Deletes one daily valuation file and clears its data from every rolled-up store,
 * including plant hours/cost/equipment, plant register attendance for that day,
 * and the matching daily progress report.
 * A full snapshot is kept in Settings → Recycle files for 90 days.
 */
export async function deleteDailyValuationFile(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { ok: false, message: "Missing project or day." }
  }

  const registry = readProjectsRegistry()
  const dailyFile = (registry.files?.[projectId]?.daily ?? []).find((file) => file?.id === dayId)

  const {
    addTrashEntry,
    buildValuationDailyTrashSnapshot,
    TRASH_ENTRY_TYPES,
  } = await import("@/lib/fileTrash")
  const { getProjectById } = await import("@/lib/projectList")

  await addTrashEntry({
    type: TRASH_ENTRY_TYPES.VALUATION_DAILY,
    projectId,
    projectName: getProjectById(projectId)?.name || "Project",
    dayId,
    label: dailyFile?.label || dayId,
    snapshot: buildValuationDailyTrashSnapshot(projectId, dayId),
  })

  await Promise.all([
    removeDayFromPrimaryProjectData(projectId, dayId),
    removeMaterialSchedulesForDay(projectId, dayId),
    removeDayFromKeyedProjectStore(PLANT_COST_STORAGE_KEY, projectId, dayId),
    removeDayFromKeyedProjectStore(PLANT_HOURS_STORAGE_KEY, projectId, dayId),
    removeDayFromKeyedProjectStore(EQUIPMENT_HOURS_STORAGE_KEY, projectId, dayId),
    clearPlantOperatorRegisterDay(projectId, dayId),
    markDailyFileDeletedInRegistry(projectId, dayId),
  ])

  invalidateProjectDataCache()
  invalidateMaterialScheduleCaches()
  invalidateGroveCaches()

  return { ok: true }
}

export function getDeletedDailyFileIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const registry = readProjectsRegistry()
  const ids = registry.files?.[projectId]?.deletedDailyIds
  return Array.isArray(ids) ? ids.filter(Boolean) : []
}

export function isDeletedDailyFileId(projectId, dayId) {
  return getDeletedDailyFileIds(projectId).includes(dayId)
}
