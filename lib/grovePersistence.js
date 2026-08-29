import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"
import { BOQ_STORAGE_KEY } from "@/lib/boqData"
import { BOQ_DESCRIPTION_MEMORY_KEY } from "@/lib/boqDescriptionMemory"
import { EQUIPMENT_HOURS_STORAGE_KEY } from "@/lib/equipmentHoursData"
import { PLANT_HOURS_STORAGE_KEY } from "@/lib/plantHoursData"
import { PLANT_COST_STORAGE_KEY } from "@/lib/plantCostData"
import { PLANT_OPERATOR_REGISTER_STORAGE_KEY } from "@/lib/plantOperatorRegisterData"
import {
  ensureChadcomStartDayHourlyDashboards,
  stripLegacyStoredSlotActivities,
  stripLegacyTargetCostFromStoredActivities,
} from "@/lib/projectData"
import {
  migrateLegacyMaterialScheduleKeys,
  purgeTargetCostMaterialSchedules,
  scrubMisdatedMaterialScheduleRows,
  MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY,
  MATERIAL_SCHEDULE_STORAGE_KEY,
} from "@/lib/materialSchedule"
import { PROJECT_DATA_STORAGE_KEY } from "@/lib/projectData"
import {
  PROJECTS_REGISTRY_KEY,
  getCustomProjects,
  migrateRegistryProjects,
} from "@/lib/projectRegistry"
import { getTodayDayId } from "@/lib/dailyFiles"
import { ensureProgressReportsExist } from "@/lib/progressReports"

export const GROVE_STORAGE_KEYS = {
  projectData: PROJECT_DATA_STORAGE_KEY,
  materialSchedules: MATERIAL_SCHEDULE_STORAGE_KEY,
  materialScheduleDrafts: MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY,
  projectsRegistry: PROJECTS_REGISTRY_KEY,
  boq: BOQ_STORAGE_KEY,
  boqDescriptionMemory: BOQ_DESCRIPTION_MEMORY_KEY,
  plantCost: PLANT_COST_STORAGE_KEY,
  plantHours: PLANT_HOURS_STORAGE_KEY,
  equipmentHours: EQUIPMENT_HOURS_STORAGE_KEY,
  plantOperatorRegisters: PLANT_OPERATOR_REGISTER_STORAGE_KEY,
  lastSession: "grove-last-session",
  bootstrapDone: "grove-bootstrap-done",
}

const MATERIAL_SCHEDULE_MIGRATION_KEY = "grove-material-schedule-migration-done"

function runMaterialScheduleMigrationOnce() {
  if (typeof window === "undefined") return false

  if (window.sessionStorage.getItem(MATERIAL_SCHEDULE_MIGRATION_KEY) === "1") {
    return false
  }

  const legacyMigrated = migrateLegacyMaterialScheduleKeys()
  const misdatedScrubbed = scrubMisdatedMaterialScheduleRows()
  window.sessionStorage.setItem(MATERIAL_SCHEDULE_MIGRATION_KEY, "1")
  return legacyMigrated || misdatedScrubbed
}

function bootstrapProject(projectId) {
  purgeTargetCostMaterialSchedules()
  stripLegacyTargetCostFromStoredActivities(projectId)
  stripLegacyStoredSlotActivities(projectId)
  ensureDailyFilesThroughToday(projectId)
  ensureProgressReportsExist(projectId)
}

function getProjectBootstrapKey(projectId) {
  return `grove-bootstrap-${projectId}-${getTodayDayId()}`
}

function bootstrapProjectIfNeeded(projectId) {
  if (!projectId) return false

  const projectKey = getProjectBootstrapKey(projectId)
  if (window.sessionStorage.getItem(projectKey) === "1") {
    return false
  }

  bootstrapProject(projectId)
  window.sessionStorage.setItem(projectKey, "1")
  return true
}

export function isGroveStorageAvailable() {
  if (typeof window === "undefined") return false

  try {
    const probe = "__grove_storage_probe__"
    window.localStorage.setItem(probe, "1")
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

const REGISTRY_MIGRATION_KEY = "grove-registry-migration-done"

function runRegistryMigrationOnce() {
  if (typeof window === "undefined") return false

  if (window.sessionStorage.getItem(REGISTRY_MIGRATION_KEY) === "1") {
    return false
  }

  migrateRegistryProjects()
  window.sessionStorage.setItem(REGISTRY_MIGRATION_KEY, "1")
  return true
}
export function initializeGrovePersistence(options = {}) {
  const { projectId = null, force = false } = options

  if (typeof window === "undefined") return { ok: false, reason: "server", changed: false }

  if (!isGroveStorageAvailable()) {
    return { ok: false, reason: "localStorage-unavailable", changed: false }
  }

  const registryMigrated = runRegistryMigrationOnce()
  const materialScheduleMigrated = runMaterialScheduleMigrationOnce()
  const chadcomSlotsAdded = ensureChadcomStartDayHourlyDashboards()

  const bootstrapDone = window.sessionStorage.getItem(GROVE_STORAGE_KEYS.bootstrapDone) === "1"

  if (!force && bootstrapDone) {
    if (projectId) {
      const changed =
        bootstrapProjectIfNeeded(projectId) ||
        chadcomSlotsAdded ||
        registryMigrated ||
        materialScheduleMigrated
      return { ok: true, changed, skipped: !changed }
    }

    return {
      ok: true,
      changed: chadcomSlotsAdded || registryMigrated || materialScheduleMigrated,
      skipped: !(chadcomSlotsAdded || registryMigrated || materialScheduleMigrated),
    }
  }

  const projectIds = new Set()
  if (projectId) {
    projectIds.add(projectId)
  }

  for (const project of getCustomProjects()) {
    if (project?.id) {
      projectIds.add(project.id)
    }
  }

  for (const id of projectIds) {
    bootstrapProject(id)
    window.sessionStorage.setItem(getProjectBootstrapKey(id), "1")
  }

  window.localStorage.setItem(GROVE_STORAGE_KEYS.lastSession, new Date().toISOString())
  window.sessionStorage.setItem(GROVE_STORAGE_KEYS.bootstrapDone, "1")

  return { ok: true, changed: true }
}

export function getGroveLastSession() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(GROVE_STORAGE_KEYS.lastSession)
}
