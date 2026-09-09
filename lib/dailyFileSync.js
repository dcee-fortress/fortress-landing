import {
  addDays,
  createBlankDailyFile,
  dayIdFromDate,
  getTodayDate,
  getTodayDayId,
  isTodayDayId,
  parseDayId,
} from "@/lib/dailyFiles"
import { ensurePeriodFilesForDay, getProjectStoreDayIds } from "@/lib/periodFiles"
import { isSeededProject } from "@/lib/projectList"
import {
  getCustomProjectById,
  getCustomProjects,
  getProjectEffectiveThroughDate,
  isDeletedProjectId,
  isEndedProject,
  isProjectEnded,
  PROJECT_STATUS,
  readProjectsRegistry,
  writeProjectsRegistry,
} from "@/lib/projectRegistry"
import { applyCalendarFilesToRegistry } from "@/lib/projectCalendarEnsure"
import { ensurePlantOperatorRegistersExist } from "@/lib/plantOperatorRegisterData"
import { ensureProgressReportsExist } from "@/lib/progressReports"

export function dayHasSavedHourlyData(projectId, dayId, savedDayIds = null) {
  if (savedDayIds) {
    return savedDayIds.has(dayId)
  }

  return getProjectStoreDayIds(projectId).includes(dayId)
}

export function getDailyFileEntryStatus(projectId, file, savedDayIds = null) {
  const hasData = dayHasSavedHourlyData(projectId, file.id, savedDayIds)
  const isToday = isTodayDayId(file.id)

  if (isToday && !hasData) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for hourly dashboards and material schedule entry",
    }
  }

  if (isToday && hasData) {
    return {
      key: "in-progress",
      label: "In progress",
      description: "Actual cost so far today — you can still edit this file",
    }
  }

  if (hasData) {
    return {
      key: "in-progress",
      label: "Saved",
      description: "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for hourly dashboards and material schedule entry",
  }
}

/** Stable status for SSR/first paint — does not read localStorage. */
export function getDailyFileEntryStatusForSsr(file) {
  if (isTodayDayId(file.id)) {
    return {
      key: "awaiting",
      label: "Awaiting entry",
      description: "Ready for hourly dashboards and material schedule entry",
    }
  }

  if (file.completedAt && file.completedAt !== "Awaiting entry") {
    return {
      key: "in-progress",
      label: "Saved",
      description: "Saved — you can still edit this file at any time",
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "Ready for hourly dashboards and material schedule entry",
  }
}

export function getDailyFileRowValueEarnedForSsr(file) {
  if (isTodayDayId(file.id)) return null
  return file.valueEarned ?? null
}

function mergeDailyFileLists(baseFiles, extraFiles) {
  const merged = new Map()

  for (const file of baseFiles) {
    merged.set(file.id, {
      ...file,
      isToday: isTodayDayId(file.id),
      awaitingEntry: isTodayDayId(file.id) && !file.awaitingEntry ? true : file.awaitingEntry,
    })
  }

  for (const file of extraFiles) {
    if (!merged.has(file.id)) {
      merged.set(file.id, file)
    }
  }

  return [...merged.values()].sort((left, right) => right.id.localeCompare(left.id))
}

export function resolveDailyFiles(projectId, baseFiles) {
  if (typeof window === "undefined") {
    return baseFiles
  }

  const today = getTodayDate()
  const project = getCustomProjectById(projectId)
  const startId = project?.startDate ?? null
  const oldestExisting = baseFiles.reduce(
    (earliest, file) => (file.id < earliest ? file.id : earliest),
    baseFiles[0]?.id
  )
  const fillFromId = startId || oldestExisting || getTodayDayId()
  const extras = []
  let cursor = parseDayId(fillFromId)

  while (cursor <= today) {
    extras.push(createBlankDailyFile(cursor, { isToday: isTodayDayId(dayIdFromDate(cursor)) }))
    cursor = addDays(cursor, 1)
  }

  return mergeDailyFileLists(baseFiles, extras).filter(
    (file) => !startId || file.id >= startId
  )
}

function ensureCustomProjectDailyFilesThroughToday(projectId) {
  const project = getCustomProjectById(projectId)
  const registry = readProjectsRegistry()
  const applied = applyCalendarFilesToRegistry(registry)

  if (applied.changed) {
    writeProjectsRegistry(applied.registry)
  }

  if (!project?.startDate) return applied.changed

  const todayId = getTodayDayId()
  const throughDayId =
    project.status === PROJECT_STATUS.ENDED
      ? getProjectEffectiveThroughDate(projectId)
      : todayId

  if (project.status !== PROJECT_STATUS.ENDED) {
    ensurePeriodFilesForDay(projectId, throughDayId)
  }

  const reportsChanged = Boolean(ensureProgressReportsExist(projectId))
  const registerChanged = Boolean(ensurePlantOperatorRegistersExist(projectId))

  return applied.changed || reportsChanged || registerChanged
}

export function ensureDailyFilesThroughToday(projectId) {
  if (typeof window === "undefined" || !projectId) return false

  if (isSeededProject(projectId)) {
    return false
  }

  if (isDeletedProjectId(projectId)) {
    return false
  }

  return ensureCustomProjectDailyFilesThroughToday(projectId)
}

export function ensureAllActiveProjectsDailyFiles() {
  if (typeof window === "undefined") return false

  let changed = false
  for (const project of getCustomProjects()) {
    if (!project?.id || isEndedProject(project) || isDeletedProjectId(project.id)) continue
    if (ensureDailyFilesThroughToday(project.id)) {
      changed = true
    }
  }
  return changed
}

export function getResolvedDailyFiles(projectId, baseFiles) {
  if (isSeededProject(projectId)) {
    return resolveDailyFiles(projectId, baseFiles)
  }

  if (typeof window !== "undefined") {
    const project = getCustomProjectById(projectId)
    const registry = readProjectsRegistry()
    const files = registry.files[projectId]?.daily ?? baseFiles
    const startDate = project?.startDate
    const bounded = startDate ? files.filter((file) => file.id >= startDate) : files

    if (isProjectEnded(projectId)) {
      const throughDayId = getProjectEffectiveThroughDate(projectId)
      return bounded.filter((file) => file.id <= throughDayId)
    }

    if (!bounded.some((file) => isTodayDayId(file.id))) {
      return resolveDailyFiles(projectId, bounded)
    }

    return bounded
  }

  return baseFiles
}
