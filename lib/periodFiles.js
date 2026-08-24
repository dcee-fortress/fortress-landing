import {
  getCustomProjectById,
  getProjectEffectiveThroughDate,
  isDayWithinProjectBounds,
  isProjectEnded,
  readProjectsRegistry,
  writeProjectsRegistry,
} from "@/lib/projectRegistry"
import {
  addDays,
  createWeekFile,
  getWeekBoundsForDay,
  isWeekEndBeforeToday,
  parseDayId,
  weekIdFromStart,
} from "@/lib/weeklyFiles"

const PROJECT_DATA_STORAGE_KEY = "grove-primary-project-data"

const MONTHS = [
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

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function pad(value) {
  return String(value).padStart(2, "0")
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function formatShortDate(date) {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function formatMonthLabel(date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function readProjectDataStore() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(PROJECT_DATA_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function getProjectStoreDayIds(projectId) {
  const projectStore = readProjectDataStore()[projectId] ?? {}

  return Object.keys(projectStore).filter(
    (dayId) =>
      /^\d{4}-\d{2}-\d{2}$/.test(dayId) &&
      Array.isArray(projectStore[dayId]) &&
      projectStore[dayId].length > 0
  )
}

export function getProjectStartDate(projectId) {
  if (projectId === "1") {
    return startOfDay(new Date(2025, 0, 1))
  }

  const project = getCustomProjectById(projectId)
  if (project?.startDate) {
    return startOfDay(new Date(project.startDate))
  }

  return startOfDay(new Date())
}

export function getMonthIdForDay(dayId) {
  const [year, month] = dayId.split("-").map(Number)
  return `${year}-${pad(month)}`
}

export function createMonthFile(year, month, inProgress = false) {
  const monthStart = new Date(year, month - 1, 1)

  return {
    id: `${year}-${pad(month)}`,
    label: formatMonthLabel(monthStart),
    month,
    year,
    completedAt: inProgress ? "In progress" : formatShortDate(addDays(new Date(year, month, 0), 1)),
    inProgress,
    valueEarned: 0,
    production: 0,
  }
}

export function isWeekPeriodComplete(weekId) {
  const [year, month, day] = weekId.split("-").map(Number)
  return isWeekEndBeforeToday(new Date(year, month - 1, day))
}

export function isMonthPeriodComplete(monthId) {
  const [year, month] = monthId.split("-").map(Number)
  const monthEnd = new Date(year, month, 0)
  return monthEnd < startOfDay(new Date())
}

export function isWeeklyFileInProgress(file) {
  if (file.inProgress) return true
  return !isWeekPeriodComplete(file.id)
}

export function isMonthlyFileInProgress(file) {
  if (file.inProgress) return true
  return !isMonthPeriodComplete(file.id)
}

function mergeFileLists(baseFiles, extraFiles, isComplete) {
  const merged = new Map()

  for (const file of baseFiles) {
    merged.set(file.id, {
      ...file,
      inProgress: file.inProgress ?? !isComplete(file.id),
    })
  }

  for (const file of extraFiles) {
    if (!merged.has(file.id)) {
      merged.set(file.id, file)
    }
  }

  return [...merged.values()].sort((left, right) => right.id.localeCompare(left.id))
}

export function getCurrentWeekFile(projectId) {
  const projectStart = getProjectStartDate(projectId)
  const bounds = getWeekBoundsForDay(startOfDay(new Date()), projectStart)
  if (!bounds) return null

  const weekId = weekIdFromStart(bounds.weekStart)

  return createWeekFile({
    weekStart: bounds.weekStart,
    weekEnd: bounds.weekEnd,
    weekNumber: bounds.weekNumber,
    inProgress: !isWeekPeriodComplete(weekId),
  })
}

export function getCurrentMonthFile(projectId) {
  const today = startOfDay(new Date())
  const monthId = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`

  return createMonthFile(today.getFullYear(), today.getMonth() + 1, !isMonthPeriodComplete(monthId))
}

export function getWeeklyFilesFromSavedDays(projectId) {
  const projectStart = getProjectStartDate(projectId)
  const files = new Map()

  for (const dayId of getProjectStoreDayIds(projectId)) {
    const bounds = getWeekBoundsForDay(parseDayId(dayId), projectStart)
    if (!bounds) continue

    const weekId = weekIdFromStart(bounds.weekStart)

    files.set(
      weekId,
      createWeekFile({
        weekStart: bounds.weekStart,
        weekEnd: bounds.weekEnd,
        weekNumber: bounds.weekNumber,
        inProgress: !isWeekPeriodComplete(weekId),
      })
    )
  }

  return [...files.values()]
}

export function getMonthlyFilesFromSavedDays(projectId) {
  const files = new Map()

  for (const dayId of getProjectStoreDayIds(projectId)) {
    const monthId = getMonthIdForDay(dayId)
    const [year, month] = monthId.split("-").map(Number)

    files.set(monthId, createMonthFile(year, month, !isMonthPeriodComplete(monthId)))
  }

  return [...files.values()]
}

export function resolveWeeklyFiles(projectId, baseFiles) {
  if (typeof window === "undefined") {
    return baseFiles
  }

  const extras = [...getWeeklyFilesFromSavedDays(projectId)]

  if (!isProjectEnded(projectId)) {
    const currentWeek = getCurrentWeekFile(projectId)
    if (currentWeek) extras.push(currentWeek)
  }

  return mergeFileLists(baseFiles, extras.filter(Boolean), isWeekPeriodComplete)
}

export function resolveMonthlyFiles(projectId, baseFiles) {
  if (typeof window === "undefined") {
    return baseFiles
  }

  const extras = [...getMonthlyFilesFromSavedDays(projectId)]

  if (!isProjectEnded(projectId)) {
    extras.push(getCurrentMonthFile(projectId))
  }

  return mergeFileLists(baseFiles, extras.filter(Boolean), isMonthPeriodComplete)
}

export function ensurePeriodFilesForDay(projectId, dayId) {
  if (typeof window === "undefined") return
  if (!isDayWithinProjectBounds(projectId, dayId)) return

  const registry = readProjectsRegistry()
  if (!registry.files[projectId]) {
    return
  }

  const projectStart = getProjectStartDate(projectId)
  const bounds = getWeekBoundsForDay(parseDayId(dayId), projectStart)
  const monthId = getMonthIdForDay(dayId)
  const [year, month] = monthId.split("-").map(Number)

  const weekly = [...(registry.files[projectId].weekly ?? [])]
  const monthly = [...(registry.files[projectId].monthly ?? [])]

  let changed = false

  if (bounds) {
    const weekId = weekIdFromStart(bounds.weekStart)
    if (!weekly.some((file) => file.id === weekId)) {
      weekly.unshift(
        createWeekFile({
          weekStart: bounds.weekStart,
          weekEnd: bounds.weekEnd,
          weekNumber: bounds.weekNumber,
          inProgress: !isWeekPeriodComplete(weekId),
        })
      )
      changed = true
    }
  }

  if (!monthly.some((file) => file.id === monthId)) {
    monthly.unshift(createMonthFile(year, month, !isMonthPeriodComplete(monthId)))
    changed = true
  }

  if (changed) {
    registry.files[projectId] = {
      ...registry.files[projectId],
      weekly,
      monthly,
    }
    writeProjectsRegistry(registry)
  }
}

export function weekHasSavedHourlyData(projectId, weekId) {
  const projectStart = getProjectStartDate(projectId)
  const [year, month, day] = weekId.split("-").map(Number)
  const weekStart = new Date(year, month - 1, day)

  return getProjectStoreDayIds(projectId).some((dayId) => {
    const bounds = getWeekBoundsForDay(parseDayId(dayId), projectStart)
    return bounds && weekIdFromStart(bounds.weekStart) === weekId
  })
}

export function monthHasSavedHourlyData(projectId, monthId) {
  return getProjectStoreDayIds(projectId).some((dayId) => getMonthIdForDay(dayId) === monthId)
}

export function shouldShowWeeklyFile(projectId, file) {
  if (!isWeeklyFileInProgress(file)) return true
  return weekHasSavedHourlyData(projectId, file.id)
}

export function shouldShowMonthlyFile(projectId, file) {
  if (!isMonthlyFileInProgress(file)) return true
  return monthHasSavedHourlyData(projectId, file.id)
}
