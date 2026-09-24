import { getGroveItem, setGroveItem, removeGroveItem } from "@/lib/groveClientStore"
import {
  ensureAllActiveProjectsDailyFiles,
  ensureDailyFilesThroughToday,
} from "@/lib/dailyFileSync"
import { BOQ_STORAGE_KEY } from "@/lib/boqData"
import { BOQ_DESCRIPTION_MEMORY_KEY } from "@/lib/boqDescriptionMemory"
import { MATERIAL_FORMULA_MEMORY_KEY } from "@/lib/materialFormulaMemory"
import { EQUIPMENT_HOURS_STORAGE_KEY } from "@/lib/equipmentHoursData"
import { PLANT_HOURS_STORAGE_KEY } from "@/lib/plantHoursData"
import { PLANT_COST_STORAGE_KEY } from "@/lib/plantCostData"
import {
  ensurePlantOperatorRegistersExist,
  PLANT_OPERATOR_REGISTER_STORAGE_KEY,
} from "@/lib/plantOperatorRegisterData"
import {
  ensureSiteStaffRegistersExist,
  SITE_STAFF_REGISTER_STORAGE_KEY,
} from "@/lib/siteStaffRegisterData"
import {
  PROJECT_DATA_STORAGE_KEY,
  ensureChadcomStartDayHourlyDashboards,
  ensureHourlyDashboardsForProject,
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
import { PETTY_CASH_STORAGE_KEY } from "@/lib/pettyCash"
import { GOODS_RECEIVED_STORAGE_KEY } from "@/lib/goodsReceived"
import { PPE_RECEIVED_STORAGE_KEY } from "@/lib/ppeReceived"
import { PPE_ISSUED_STORAGE_KEY } from "@/lib/ppeIssued"
import { INDUCTION_REGISTER_STORAGE_KEY } from "@/lib/inductionRegisterData"
import { SHEQ_SITE_INSPECTION_STORAGE_KEY } from "@/lib/sheqSiteInspection"
import { SHEQ_INCIDENT_STORAGE_KEY } from "@/lib/sheqIncident"
import { SHEQ_WEEKLY_REPORT_STORAGE_KEY } from "@/lib/sheqWeeklyReport"
import { SHEQ_HOME_ALERTS_STORAGE_KEY } from "@/lib/sheqHomeAlerts"
import { FILE_TRASH_STORAGE_KEY } from "@/lib/fileTrash"
import { getTodayDayId } from "@/lib/dailyFiles"
import {
  PROJECTS_REGISTRY_KEY,
  getCustomProjects,
  migrateRegistryProjects,
} from "@/lib/projectRegistry"
import { stripDemoSharedValue } from "@/lib/sharedStorageMerge"
import { ensureProgressReportsExist } from "@/lib/progressReports"

export const GROVE_STORAGE_KEYS = {
  projectData: PROJECT_DATA_STORAGE_KEY,
  materialSchedules: MATERIAL_SCHEDULE_STORAGE_KEY,
  materialScheduleDrafts: MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY,
  pettyCash: PETTY_CASH_STORAGE_KEY,
  goodsReceived: GOODS_RECEIVED_STORAGE_KEY,
  ppeReceived: PPE_RECEIVED_STORAGE_KEY,
  ppeIssued: PPE_ISSUED_STORAGE_KEY,
  inductionRegisters: INDUCTION_REGISTER_STORAGE_KEY,
  sheqSiteInspection: SHEQ_SITE_INSPECTION_STORAGE_KEY,
  sheqIncident: SHEQ_INCIDENT_STORAGE_KEY,
  sheqWeeklyReport: SHEQ_WEEKLY_REPORT_STORAGE_KEY,
  sheqHomeAlerts: SHEQ_HOME_ALERTS_STORAGE_KEY,
  fileTrash: FILE_TRASH_STORAGE_KEY,
  projectsRegistry: PROJECTS_REGISTRY_KEY,
  deletedProjectIds: "grove-deleted-project-ids",
  storageUpdatedAt: "grove-storage-updated-at",
  boq: BOQ_STORAGE_KEY,
  boqDescriptionMemory: BOQ_DESCRIPTION_MEMORY_KEY,
  materialFormulaMemory: MATERIAL_FORMULA_MEMORY_KEY,
  plantCost: PLANT_COST_STORAGE_KEY,
  plantHours: PLANT_HOURS_STORAGE_KEY,
  equipmentHours: EQUIPMENT_HOURS_STORAGE_KEY,
  plantOperatorRegisters: PLANT_OPERATOR_REGISTER_STORAGE_KEY,
  siteStaffRegisters: SITE_STAFF_REGISTER_STORAGE_KEY,
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
  ensureHourlyDashboardsForProject(projectId)
  ensureProgressReportsExist(projectId)
  ensurePlantOperatorRegistersExist(projectId)
  ensureSiteStaffRegistersExist(projectId)
}

function bootstrapCalendarFiles() {
  return ensureAllActiveProjectsDailyFiles()
}

function purgeDemoFromSharedCache() {
  if (typeof window === "undefined") return false

  let changed = false
  for (const key of Object.values(GROVE_STORAGE_KEYS)) {
    const raw = getGroveItem(key)
    if (typeof raw !== "string") continue
    const cleaned = stripDemoSharedValue(raw)
    if (cleaned !== raw) {
      void import("@/lib/saveToPostgres").then(({ saveGroveKey }) => saveGroveKey(key, cleaned, { replace: true }))
      changed = true
    }
  }
  return changed
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
    setGroveItem(probe, "1")
    removeGroveItem(probe)
    return true
  } catch {
    return false
  }
}

const REGISTRY_MIGRATION_KEY = "grove-registry-migration-v4-start-date"

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
    return { ok: false, reason: "memory-store-unavailable", changed: false }
  }

  runRegistryMigrationOnce()
  purgeDemoFromSharedCache()
  runMaterialScheduleMigrationOnce()

  const bootstrapDone = window.sessionStorage.getItem(GROVE_STORAGE_KEYS.bootstrapDone) === "1"

  if (!force && bootstrapDone) {
    if (projectId) {
      const changed = bootstrapProjectIfNeeded(projectId)
      return { ok: true, changed, skipped: !changed }
    }

    return { ok: true, changed: false, skipped: true }
  }

  ensureChadcomStartDayHourlyDashboards()
  bootstrapCalendarFiles()

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

  setGroveItem(GROVE_STORAGE_KEYS.lastSession, new Date().toISOString())
  window.sessionStorage.setItem(GROVE_STORAGE_KEYS.bootstrapDone, "1")

  return { ok: true, changed: true }
}

export function getGroveLastSession() {
  if (typeof window === "undefined") return null
  return getGroveItem(GROVE_STORAGE_KEYS.lastSession)
}
