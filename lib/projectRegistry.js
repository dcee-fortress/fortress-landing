import { dayIdFromDate, generateBlankDailyFiles, getTodayDayId, startOfDay } from "@/lib/dailyFiles"
import { generateProgressReports } from "@/lib/progressReportGenerator"
import { createLocalStorageCache } from "@/lib/storageCache"
import { generateBlankWeeklyFiles } from "@/lib/weeklyFiles"

export const PROJECTS_REGISTRY_KEY = "grove-projects-registry"
export const SEEDED_PROJECT_ID = "1"
export const CHADCOM_START_DATE = "2026-08-18"

export const PROJECT_STATUS = {
  ACTIVE: "active",
  ENDED: "ended",
}

const ZERO_TOTALS = { valueEarned: 0, production: 0 }
const EMPTY_REGISTRY = { projects: [], files: {} }
const registryStore = createLocalStorageCache(PROJECTS_REGISTRY_KEY, EMPTY_REGISTRY)

function readRegistry() {
  if (typeof window === "undefined") {
    return EMPTY_REGISTRY
  }

  try {
    const parsed = registryStore.read()
    return {
      projects: parsed.projects ?? [],
      files: parsed.files ?? {},
    }
  } catch {
    return EMPTY_REGISTRY
  }
}

function writeRegistry(registry) {
  if (typeof window === "undefined") return
  try {
    registryStore.write(registry)
  } catch (error) {
    if (error?.name === "QuotaExceededError") {
      throw new Error(
        "Storage is full. Remove older photos or site plans, then try again."
      )
    }
    throw error
  }
}

function pad(value) {
  return String(value).padStart(2, "0")
}

function formatMonthLabel(date) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatShortDate(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function generateBlankMonthlyFiles(projectStart, throughDay) {
  const files = []
  let cursor = new Date(projectStart.getFullYear(), projectStart.getMonth(), 1)
  const end = startOfDay(throughDay)

  while (cursor <= end) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const inProgress = monthEnd > end
    const monthId = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`

    files.push({
      id: monthId,
      label: formatMonthLabel(cursor),
      month: cursor.getMonth() + 1,
      year: cursor.getFullYear(),
      completedAt: inProgress ? "In progress" : formatShortDate(addDays(monthEnd, 1)),
      inProgress,
      ...ZERO_TOTALS,
    })

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return files.reverse()
}

function mergeFilesById(existingFiles, generatedFiles) {
  const merged = new Map()

  for (const file of generatedFiles) {
    merged.set(file.id, file)
  }

  for (const file of existingFiles ?? []) {
    if (merged.has(file.id)) {
      merged.set(file.id, { ...merged.get(file.id), ...file })
    }
  }

  return [...merged.values()].sort((left, right) => right.id.localeCompare(left.id))
}

function getEffectiveThroughDateForProject(project) {
  const todayId = getTodayDayId()

  if (project?.status === PROJECT_STATUS.ENDED && project.endDate) {
    return project.endDate < todayId ? project.endDate : project.endDate
  }

  return todayId
}

export function normalizeProjectRecord(project) {
  if (!project) return project

  const status =
    project.status ??
    (project.active === false ? PROJECT_STATUS.ENDED : PROJECT_STATUS.ACTIVE)

  return {
    ...project,
    status,
    active: status === PROJECT_STATUS.ACTIVE,
    endDate: project.endDate ?? null,
    endedAt: project.endedAt ?? null,
  }
}

function rebuildProjectPeriodFilesInRegistry(registry, projectId, startDate, throughDate) {
  const projectFiles = registry.files[projectId]
  if (!projectFiles) return

  const start = startOfDay(new Date(startDate))
  const through = startOfDay(new Date(throughDate))

  if (start > through) {
    return
  }

  const generatedDaily = generateBlankDailyFiles(start, through)
  const daily = mergeFilesById(projectFiles.daily, generatedDaily).filter(
    (file) => file.id >= startDate && file.id <= dayIdFromDate(through)
  )

  const generatedWeekly =
    start <= through ? generateBlankWeeklyFiles(start, through) : []
  const generatedMonthly =
    start <= through ? generateBlankMonthlyFiles(start, through) : []
  const generatedProgress =
    start <= through ? generateProgressReports(start, through) : []

  registry.files[projectId] = {
    ...projectFiles,
    daily,
    weekly: mergeFilesById(projectFiles.weekly, generatedWeekly),
    monthly: mergeFilesById(projectFiles.monthly, generatedMonthly),
    progressReports: mergeFilesById(projectFiles.progressReports, generatedProgress),
  }
}

function finalizeProjectFilesAtEnd(registry, projectId, endDate) {
  const projectFiles = registry.files[projectId]
  if (!projectFiles) return

  const end = startOfDay(new Date(endDate))

  const daily = (projectFiles.daily ?? []).filter((file) => file.id <= endDate)
  const weekly = (projectFiles.weekly ?? []).map((file) => {
    if (file.id <= endDate) {
      return {
        ...file,
        inProgress: false,
        completedAt: file.completedAt === "In progress" ? formatShortDate(addDays(end, 1)) : file.completedAt,
      }
    }
    return file
  }).filter((file) => file.id <= endDate)

  const monthly = (projectFiles.monthly ?? []).map((file) => {
    const monthEnd = new Date(file.year, file.month, 0)
    if (monthEnd <= end) {
      return {
        ...file,
        inProgress: false,
        completedAt: file.completedAt === "In progress" ? formatShortDate(addDays(monthEnd, 1)) : file.completedAt,
      }
    }
    return file
  }).filter((file) => file.id <= `${end.getFullYear()}-${pad(end.getMonth() + 1)}`)

  registry.files[projectId] = {
    ...projectFiles,
    daily,
    weekly,
    monthly,
  }
}

function clearProjectSyncSessionKeys(projectId) {
  if (typeof window === "undefined") return

  window.sessionStorage.removeItem(`grove-bootstrap-${projectId}`)
  window.sessionStorage.removeItem(`grove-daily-sync-${projectId}-${getTodayDayId()}`)
}

function buildInitialFiles(startDate, throughDate = null) {
  const start = startOfDay(new Date(startDate))
  const through = startOfDay(throughDate ? new Date(throughDate) : new Date())

  return {
    daily: generateBlankDailyFiles(start, through),
    weekly: start <= through ? generateBlankWeeklyFiles(start, through) : [],
    monthly: start <= through ? generateBlankMonthlyFiles(start, through) : [],
    progressReports: start <= through ? generateProgressReports(start, through) : [],
  }
}

export function readProjectsRegistry() {
  return readRegistry()
}

export function writeProjectsRegistry(registry) {
  writeRegistry(registry)
}

export function getCustomProjects() {
  return readRegistry().projects.map(normalizeProjectRecord)
}

export function getCustomProjectById(id) {
  const project = readRegistry().projects.find((item) => item.id === id) ?? null
  return project ? normalizeProjectRecord(project) : null
}

export function getCustomProjectFiles(projectId) {
  return readRegistry().files[projectId] ?? null
}

export function isProjectEnded(projectId) {
  const project = getCustomProjectById(projectId)
  return project?.status === PROJECT_STATUS.ENDED
}

export function getProjectEffectiveThroughDate(projectId) {
  const project = getCustomProjectById(projectId)
  return getEffectiveThroughDateForProject(project)
}

export function isDayWithinProjectBounds(projectId, dayId) {
  const project = getCustomProjectById(projectId)
  if (!project?.startDate) return true

  if (dayId < project.startDate) return false

  if (project.status === PROJECT_STATUS.ENDED && project.endDate) {
    return dayId <= project.endDate
  }

  return true
}

export function createCustomProject(name, options = {}) {
  const trimmed = name.trim()
  if (!trimmed) return null

  const registry = readRegistry()
  const startDate = options.startDate ?? getTodayDayId()
  const id = `p-${Date.now()}`

  const project = normalizeProjectRecord({
    id,
    name: trimmed,
    active: true,
    seeded: false,
    status: PROJECT_STATUS.ACTIVE,
    startDate,
    endDate: null,
    endedAt: null,
    createdAt: new Date().toISOString(),
  })

  registry.projects = [...registry.projects, project]
  registry.files[id] = buildInitialFiles(startDate)
  writeRegistry(registry)

  return project
}

export function endCustomProject(projectId, endDate = null) {
  if (projectId === SEEDED_PROJECT_ID || !projectId.startsWith("p-")) {
    return null
  }

  const registry = readRegistry()
  const index = registry.projects.findIndex((project) => project.id === projectId)
  if (index === -1) return null

  const project = normalizeProjectRecord(registry.projects[index])
  const resolvedEndDate = endDate ?? getTodayDayId()

  if (resolvedEndDate < project.startDate) {
    throw new Error("End date cannot be before the project start date.")
  }

  const endedProject = normalizeProjectRecord({
    ...project,
    status: PROJECT_STATUS.ENDED,
    active: false,
    endDate: resolvedEndDate,
    endedAt: new Date().toISOString(),
  })

  registry.projects[index] = endedProject
  rebuildProjectPeriodFilesInRegistry(
    registry,
    projectId,
    project.startDate,
    resolvedEndDate
  )
  finalizeProjectFilesAtEnd(registry, projectId, resolvedEndDate)
  writeRegistry(registry)
  clearProjectSyncSessionKeys(projectId)

  return endedProject
}

export function migrateRegistryProjects() {
  const registry = readRegistry()
  let changed = false

  registry.projects = registry.projects.map((project) => {
    const normalized = normalizeProjectRecord(project)
    if (JSON.stringify(normalized) !== JSON.stringify(project)) {
      changed = true
    }
    return normalized
  })

  for (const project of registry.projects) {
    if (/^chadcom$/i.test(project.name.trim())) {
      const throughDate = getEffectiveThroughDateForProject(project)
      const beforeDaily = JSON.stringify(registry.files[project.id]?.daily ?? [])

      if (project.startDate !== CHADCOM_START_DATE) {
        project.startDate = CHADCOM_START_DATE
        changed = true
      }

      rebuildProjectPeriodFilesInRegistry(
        registry,
        project.id,
        CHADCOM_START_DATE,
        throughDate
      )

      const afterDaily = JSON.stringify(registry.files[project.id]?.daily ?? [])
      if (beforeDaily !== afterDaily) {
        changed = true
      }
    }
  }

  if (changed) {
    writeRegistry(registry)
  }

  return changed
}

export function isCustomProject(projectId) {
  return projectId !== SEEDED_PROJECT_ID && projectId.startsWith("p-")
}

export function deleteCustomProject(projectId) {
  if (projectId === SEEDED_PROJECT_ID || !projectId.startsWith("p-")) {
    return false
  }

  const registry = readRegistry()
  registry.projects = registry.projects.filter((project) => project.id !== projectId)
  delete registry.files[projectId]
  writeRegistry(registry)
  clearProjectSyncSessionKeys(projectId)
  return true
}

export function clearProjectsRegistry() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(PROJECTS_REGISTRY_KEY)
  registryStore.invalidate()
}
