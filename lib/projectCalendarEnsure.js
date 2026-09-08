import {
  addDays,
  createBlankDailyFile,
  dayIdFromDate,
  getTodayDayId,
  parseDayId,
  parseProjectDayId,
  startOfDay,
} from "@/lib/dailyFiles"
import {
  generateDailyProgressReports,
  generateProgressReports,
} from "@/lib/progressReportGenerator"
import { generateBlankWeeklyFiles, pad } from "@/lib/weeklyFiles"
import { CHADCOM_START_DATE } from "@/lib/projectRegistry"

const PROJECT_STATUS = {
  ACTIVE: "active",
  ENDED: "ended",
}

function emptyProjectFiles() {
  return {
    daily: [],
    weekly: [],
    monthly: [],
    progressReports: [],
    weeklyProgressReports: [],
    dailyProgressReports: [],
  }
}

function generateBlankMonthlyFiles(projectStart, throughDay) {
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
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const files = []
  let cursor = new Date(projectStart.getFullYear(), projectStart.getMonth(), 1)
  const end = startOfDay(throughDay)

  while (cursor <= end) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const inProgress = monthEnd > end
    const monthId = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`
    const completedDate = addDays(monthEnd, 1)

    files.push({
      id: monthId,
      label: `${months[cursor.getMonth()]} ${cursor.getFullYear()}`,
      month: cursor.getMonth() + 1,
      year: cursor.getFullYear(),
      completedAt: inProgress
        ? "In progress"
        : `${completedDate.getDate()} ${shortMonths[completedDate.getMonth()]} ${completedDate.getFullYear()}`,
      inProgress,
      valueEarned: 0,
      production: 0,
    })

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return files.reverse()
}

function withTodayFlags(file, todayId) {
  return {
    ...file,
    isToday: file.id === todayId,
  }
}

function mergeById(existing = [], incoming = []) {
  const merged = new Map()

  for (const item of existing) {
    if (item?.id) merged.set(item.id, item)
  }

  for (const item of incoming) {
    if (!item?.id) continue
    const previous = merged.get(item.id)
    merged.set(item.id, previous ? { ...previous, ...item } : item)
  }

  return [...merged.values()]
}

function unionGeneratedById(existing = [], generated = []) {
  const merged = new Map()

  for (const item of generated) {
    if (item?.id) merged.set(item.id, item)
  }

  for (const item of existing) {
    if (!item?.id) continue
    const generatedItem = merged.get(item.id)
    merged.set(item.id, generatedItem ? { ...generatedItem, ...item } : item)
  }

  return [...merged.values()]
}

function mergeProgressById(existing = [], incoming = []) {
  const merged = new Map()

  for (const item of existing) {
    if (item?.id) merged.set(item.id, item)
  }

  for (const item of incoming) {
    if (!item?.id) continue
    const previous = merged.get(item.id)
    if (!previous) {
      merged.set(item.id, item)
      continue
    }

    const previousTime = Date.parse(previous.updatedAt || previous.progressUpdate?.updatedAt || 0) || 0
    const incomingTime = Date.parse(item.updatedAt || item.progressUpdate?.updatedAt || 0) || 0
    merged.set(item.id, incomingTime >= previousTime ? { ...previous, ...item } : { ...item, ...previous })
  }

  return [...merged.values()]
}

function idsKey(items = []) {
  return items.map((item) => item.id).sort().join("|")
}

function throughDayIdForProject(project, todayId) {
  const status =
    project.status ?? (project.active === false ? PROJECT_STATUS.ENDED : PROJECT_STATUS.ACTIVE)

  if (status === PROJECT_STATUS.ENDED && project.endDate) {
    return project.endDate < todayId ? project.endDate : project.endDate
  }

  return todayId
}

function fillProjectCalendarFiles(projectFiles, project, todayId) {
  const start = parseProjectDayId(project.startDate)
  const throughId = throughDayIdForProject(project, todayId)
  const through = parseDayId(throughId)
  const bucket = { ...emptyProjectFiles(), ...projectFiles }

  if (start > through) {
    return { files: bucket, changed: false }
  }

  const daily = [...(bucket.daily ?? [])]
  const existingDailyIds = new Set(daily.map((file) => file.id))
  const newDaily = []
  let cursor = start

  while (cursor <= through) {
    const id = dayIdFromDate(cursor)
    if (!existingDailyIds.has(id)) {
      newDaily.push(createBlankDailyFile(cursor, { isToday: id === todayId }))
    }
    cursor = addDays(cursor, 1)
  }

  const nextDaily = [...newDaily, ...daily]
    .map((file) => withTodayFlags(file, todayId))
    .filter((file) => file.id >= project.startDate && file.id <= throughId)
    .sort((left, right) => right.id.localeCompare(left.id))

  const generatedWeekly = generateProgressReports(start, through)
  const generatedDaily = generateDailyProgressReports(start, through)
  const progressWeekIds = new Set(generatedWeekly.map((file) => file.id))
  const progressDayIds = new Set(generatedDaily.map((file) => file.id))
  const nextWeekly = unionGeneratedById(
    bucket.weeklyProgressReports ?? bucket.progressReports,
    generatedWeekly
  )
    .filter((file) => progressWeekIds.has(file.id))
    .sort((left, right) => right.id.localeCompare(left.id))
  const nextDailyReports = unionGeneratedById(bucket.dailyProgressReports, generatedDaily)
    .filter((file) => progressDayIds.has(file.id))
    .sort((left, right) => right.id.localeCompare(left.id))
  const generatedWeeklyValuations = generateBlankWeeklyFiles(start, through)
  const generatedMonthlyValuations = generateBlankMonthlyFiles(start, through)
  const weeklyValuationIds = new Set(generatedWeeklyValuations.map((file) => file.id))
  const monthlyValuationIds = new Set(generatedMonthlyValuations.map((file) => file.id))
  const nextWeeklyValuations = unionGeneratedById(bucket.weekly, generatedWeeklyValuations)
    .filter((file) => weeklyValuationIds.has(file.id))
    .sort((left, right) => right.id.localeCompare(left.id))
  const nextMonthlyValuations = unionGeneratedById(bucket.monthly, generatedMonthlyValuations)
    .filter((file) => monthlyValuationIds.has(file.id))
    .sort((left, right) => right.id.localeCompare(left.id))

  const flagsChanged = daily.some((file) => {
    const next = withTodayFlags(file, todayId)
    return file.isToday !== next.isToday
  })

  const changed =
    newDaily.length > 0 ||
    flagsChanged ||
    idsKey(nextDaily) !== idsKey(daily) ||
    idsKey(nextWeeklyValuations) !== idsKey(bucket.weekly ?? []) ||
    idsKey(nextMonthlyValuations) !== idsKey(bucket.monthly ?? []) ||
    idsKey(nextWeekly) !== idsKey(bucket.weeklyProgressReports ?? bucket.progressReports) ||
    idsKey(nextDailyReports) !== idsKey(bucket.dailyProgressReports)

  return {
    changed,
    files: {
      ...bucket,
      daily: nextDaily,
      weekly: nextWeeklyValuations,
      monthly: nextMonthlyValuations,
      weeklyProgressReports: nextWeekly,
      progressReports: nextWeekly,
      dailyProgressReports: nextDailyReports,
    },
  }
}

export function applyCalendarFilesToRegistry(registry, todayId = getTodayDayId()) {
  const projects = Array.isArray(registry?.projects) ? registry.projects : []
  const files = { ...(registry?.files ?? {}) }
  let changed = false

  for (const project of projects) {
    if (!project?.id || !project.startDate) continue

    const current = files[project.id] ?? emptyProjectFiles()
    const filled = fillProjectCalendarFiles(current, project, todayId)
    if (filled.changed) {
      files[project.id] = filled.files
      changed = true
    } else {
      files[project.id] = filled.files
    }
  }

  return {
    changed,
    registry: {
      ...registry,
      projects,
      files,
    },
  }
}

function mergeProjectRecords(existing, incoming) {
  const left = existing && typeof existing === "object" ? existing : {}
  const right = incoming && typeof incoming === "object" ? incoming : {}
  const leftStatus =
    left.status ?? (left.active === false ? PROJECT_STATUS.ENDED : PROJECT_STATUS.ACTIVE)
  const rightStatus =
    right.status ?? (right.active === false ? PROJECT_STATUS.ENDED : PROJECT_STATUS.ACTIVE)
  const merged = { ...left, ...right }
  const chadcomStart = CHADCOM_START_DATE

  if (left.startDate && right.startDate) {
    if (left.startDate === chadcomStart && right.startDate !== chadcomStart) {
      merged.startDate = right.startDate
    } else if (right.startDate === chadcomStart && left.startDate !== chadcomStart) {
      merged.startDate = left.startDate
    }
  }

  if (leftStatus === PROJECT_STATUS.ENDED || rightStatus === PROJECT_STATUS.ENDED) {
    merged.status = PROJECT_STATUS.ENDED
    merged.active = false
    merged.endDate = right.endDate || left.endDate || null
    merged.endedAt = right.endedAt || left.endedAt || null
  }

  return merged
}

export function mergeProjectRegistries(existingRegistry, incomingRegistry, todayId = getTodayDayId()) {
  const existing = existingRegistry && typeof existingRegistry === "object" ? existingRegistry : { projects: [], files: {} }
  const incoming = incomingRegistry && typeof incomingRegistry === "object" ? incomingRegistry : { projects: [], files: {} }
  const deletedIds = [...new Set([...(existing.deletedIds ?? []), ...(incoming.deletedIds ?? [])])]
  const deletedSet = new Set(deletedIds)

  const projectsById = new Map()
  for (const project of existing.projects ?? []) {
    if (project?.id && !deletedSet.has(project.id)) projectsById.set(project.id, project)
  }
  for (const project of incoming.projects ?? []) {
    if (project?.id && !deletedSet.has(project.id)) {
      projectsById.set(project.id, mergeProjectRecords(projectsById.get(project.id), project))
    }
  }

  const files = {}
  const projectIds = new Set([
    ...Object.keys(existing.files ?? {}),
    ...Object.keys(incoming.files ?? {}),
    ...[...projectsById.keys()],
  ])

  for (const projectId of projectIds) {
    if (deletedSet.has(projectId)) continue
    const previous = existing.files?.[projectId] ?? emptyProjectFiles()
    const next = incoming.files?.[projectId] ?? emptyProjectFiles()
    files[projectId] = {
      ...previous,
      ...next,
      daily: mergeById(previous.daily, next.daily),
      weekly: mergeById(previous.weekly, next.weekly),
      monthly: mergeById(previous.monthly, next.monthly),
      progressReports: mergeProgressById(previous.progressReports, next.progressReports),
      weeklyProgressReports: mergeProgressById(
        previous.weeklyProgressReports ?? previous.progressReports,
        next.weeklyProgressReports ?? next.progressReports
      ),
      dailyProgressReports: mergeProgressById(
        previous.dailyProgressReports,
        next.dailyProgressReports
      ),
    }
  }

  return applyCalendarFilesToRegistry(
    {
      ...existing,
      ...incoming,
      deletedIds,
      projects: [...projectsById.values()],
      files,
    },
    todayId
  )
}

export function parseRegistryJson(value) {
  if (typeof value !== "string" || !value) {
    return { projects: [], files: {} }
  }

  try {
    const parsed = JSON.parse(value)
    return {
      projects: parsed.projects ?? [],
      files: parsed.files ?? {},
      ...parsed,
    }
  } catch {
    return { projects: [], files: {} }
  }
}
