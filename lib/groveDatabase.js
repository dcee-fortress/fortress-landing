import { clearProjectsRegistry, deleteCustomProject, endCustomProject, SEEDED_PROJECT_ID } from "@/lib/projectRegistry"
import { clearAllBoqs, removeBoqsForProject } from "@/lib/boqData"
import { clearAllDescriptionMemory, removeDescriptionMemoryForProject } from "@/lib/boqDescriptionMemory"
import { resetDemoValuesPreference } from "@/lib/demoMode"
import { clearAllEquipmentHours, removeEquipmentHoursForProject } from "@/lib/equipmentHoursData"
import { GROVE_STORAGE_KEYS } from "@/lib/grovePersistence"
import {
  clearAllMaterialSchedules,
  removeMaterialSchedulesForProject,
} from "@/lib/materialSchedule"
import { clearAllPlantCosts, removePlantCostForProject } from "@/lib/plantCostData"
import {
  clearAllPlantHours,
  clearPlantHoursForProject,
} from "@/lib/plantHoursData"
import {
  clearAllPlantOperatorRegisters,
  removePlantOperatorRegistersForProject,
} from "@/lib/plantOperatorRegisterData"
import { clearAllProjectData, removeProjectData } from "@/lib/projectData"

function clearProjectScopedData(projectId) {
  removeMaterialSchedulesForProject(projectId)
  removeProjectData(projectId)
  clearPlantHoursForProject(projectId)
  removeBoqsForProject(projectId)
  removeDescriptionMemoryForProject(projectId)
  removePlantCostForProject(projectId)
  removeEquipmentHoursForProject(projectId)
  removePlantOperatorRegistersForProject(projectId)
}

export function clearEntireGroveDatabase() {
  if (typeof window === "undefined") return

  clearAllProjectData()
  clearAllMaterialSchedules()
  clearAllBoqs()
  clearAllDescriptionMemory()
  clearAllPlantCosts()
  clearAllEquipmentHours()
  clearAllPlantHours()
  clearAllPlantOperatorRegisters()
  resetDemoValuesPreference()
  clearProjectsRegistry()
  window.localStorage.removeItem(GROVE_STORAGE_KEYS.lastSession)
}

export function deleteGroveProject(projectId) {
  if (typeof window === "undefined") return { ok: false }

  clearProjectScopedData(projectId)

  if (projectId === SEEDED_PROJECT_ID) {
    return {
      ok: true,
      seeded: true,
      message: "Roads demo data has been reset. The built-in project remains available.",
    }
  }

  const removed = deleteCustomProject(projectId)
  return removed
    ? {
        ok: true,
        seeded: false,
        message: "Project and all related data have been deleted.",
      }
    : { ok: false, message: "Could not delete this project." }
}

export function canDeleteProject(projectId) {
  return Boolean(projectId)
}

export function endGroveProject(projectId, endDate = null) {
  if (typeof window === "undefined") return { ok: false, message: "Not available on server." }

  if (projectId === SEEDED_PROJECT_ID) {
    return { ok: false, message: "The built-in demo project cannot be ended from settings." }
  }

  try {
    const project = endCustomProject(projectId, endDate)
    if (!project) {
      return { ok: false, message: "Could not end this project." }
    }

    return {
      ok: true,
      message: `"${project.name}" ended on ${project.endDate}. All saved data is kept and no new dates will be added.`,
      project,
    }
  } catch (error) {
    return { ok: false, message: error.message ?? "Could not end this project." }
  }
}

export async function exportGroveDatabaseBackup() {
  if (typeof window === "undefined") return

  const backup = {
    exportedAt: new Date().toISOString(),
    data: {},
  }

  let liveData = null
  try {
    const response = await fetch("/api/shared-storage", { cache: "no-store" })
    if (response.ok) liveData = await response.json()
  } catch {
    liveData = null
  }

  for (const storageKey of Object.values(GROVE_STORAGE_KEYS)) {
    const value = liveData?.[storageKey] ?? window.localStorage.getItem(storageKey)
    if (value !== null) {
      backup.data[storageKey] = value
    }
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `grove-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
