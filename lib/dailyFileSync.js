import {
  addDays,
  createBlankDailyFile,
  dayIdFromDate,
  generateBlankDailyFilesFromDate,
  getTodayDate,
  getTodayDayId,
  isTodayDayId,
  parseDayId,
  startOfDay,
} from "@/lib/dailyFiles"
import { getProjectStoreDayIds } from "@/lib/periodFiles"
import { isSeededProject } from "@/lib/projectList"
import {
  getCustomProjectById,
  getProjectEffectiveThroughDate,
  isProjectEnded,
  readProjectsRegistry,
  writeProjectsRegistry,
} from "@/lib/projectRegistry"

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
      description: `Actual cost so far today`,
    }
  }

  if (hasData) {
    return {
      key: "completed",
      label: "Completed",
      description: `Completed ${file.completedAt}`,
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "No hourly data saved for this day",
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
      key: "completed",
      label: "Completed",
      description: `Completed ${file.completedAt}`,
    }
  }

  return {
    key: "awaiting",
    label: "Awaiting entry",
    description: "No hourly data saved for this day",
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
  if (typeof window === "undefined" || baseFiles.length === 0) {
    return baseFiles
  }

  const today = getTodayDate()
  const newestExisting = baseFiles.reduce(
    (latest, file) => (file.id > latest ? file.id : latest),
    baseFiles[0].id
  )
  const cursor = addDays(parseDayId(newestExisting), 1)

  if (cursor > today) {
    return mergeDailyFileLists(
      baseFiles,
      baseFiles.some((file) => isTodayDayId(file.id))
        ? []
        : [createBlankDailyFile(today, { isToday: true })]
    )
  }

  const extras = generateBlankDailyFilesFromDate(cursor, today)
  return mergeDailyFileLists(baseFiles, extras)
}

function ensureCustomProjectDailyFilesThroughToday(projectId) {
  const registry = readProjectsRegistry()
  const projectFiles = registry.files[projectId]
  if (!projectFiles) return

  const project = getCustomProjectById(projectId)
  if (!project?.startDate) return

  const start = startOfDay(new Date(project.startDate))
  const throughDayId = getProjectEffectiveThroughDate(projectId)
  const through = parseDayId(throughDayId)
  const daily = [...(projectFiles.daily ?? [])]
  const existingIds = new Set(daily.map((file) => file.id))

  let cursor
  if (daily.length === 0) {
    cursor = start
  } else {
    const newestId = daily.reduce(
      (latest, file) => (file.id > latest ? file.id : latest),
      daily[0].id
    )
    cursor = addDays(parseDayId(newestId), 1)
  }

  const newFiles = []
  while (cursor <= through) {
    const id = dayIdFromDate(cursor)
    if (!existingIds.has(id)) {
      newFiles.push(createBlankDailyFile(cursor, { isToday: id === getTodayDayId() }))
    }
    cursor = addDays(cursor, 1)
  }

  if (newFiles.length === 0) {
    return
  }

  registry.files[projectId] = {
    ...projectFiles,
    daily: [...newFiles.reverse(), ...daily],
  }
  writeProjectsRegistry(registry)
}

function getDailySyncSessionKey(projectId) {
  return `grove-daily-sync-${projectId}-${getTodayDayId()}`
}

export function ensureDailyFilesThroughToday(projectId) {
  if (typeof window === "undefined") return

  if (isSeededProject(projectId)) {
    return
  }

  const syncKey = getDailySyncSessionKey(projectId)
  if (window.sessionStorage.getItem(syncKey) === "1") {
    return
  }

  ensureCustomProjectDailyFilesThroughToday(projectId)
  window.sessionStorage.setItem(syncKey, "1")
}

export function getResolvedDailyFiles(projectId, baseFiles) {
  ensureDailyFilesThroughToday(projectId)

  if (isSeededProject(projectId)) {
    return resolveDailyFiles(projectId, baseFiles)
  }

  if (typeof window !== "undefined") {
    const registry = readProjectsRegistry()
    const files = registry.files[projectId]?.daily ?? baseFiles

    if (isProjectEnded(projectId)) {
      const throughDayId = getProjectEffectiveThroughDate(projectId)
      return files.filter((file) => file.id <= throughDayId)
    }

    return files
  }

  return baseFiles
}
