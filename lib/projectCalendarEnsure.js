import {
  addDays,
  createBlankDailyFile,
  dayIdFromDate,
  getTodayDayId,
  parseDayId,
} from "@/lib/dailyFiles"
import {
  generateDailyProgressReports,
  generateProgressReports,
} from "@/lib/progressReportGenerator"

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

function withTodayFlags(file, todayId) {
  const isToday = file.id === todayId
  return {
    ...file,
    isToday,
    awaitingEntry: isToday,
    completedAt: isToday
      ? "Awaiting entry"
      : file.completedAt === "Awaiting entry"
        ? file.date
        : file.completedAt,
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
  const start = parseDayId(project.startDate)
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
    .sort((left, right) => right.id.localeCompare(left.id))

  const generatedWeekly = generateProgressReports(start, through)
  const generatedDaily = generateDailyProgressReports(start, through)
  const nextWeekly = unionGeneratedById(
    bucket.weeklyProgressReports ?? bucket.progressReports,
    generatedWeekly
  ).sort((left, right) => right.id.localeCompare(left.id))
  const nextDailyReports = unionGeneratedById(bucket.dailyProgressReports, generatedDaily).sort(
    (left, right) => right.id.localeCompare(left.id)
  )

  const flagsChanged = daily.some((file) => {
    const next = withTodayFlags(file, todayId)
    return file.isToday !== next.isToday || file.awaitingEntry !== next.awaitingEntry
  })

  const changed =
    newDaily.length > 0 ||
    flagsChanged ||
    idsKey(nextDaily) !== idsKey(daily) ||
    idsKey(nextWeekly) !== idsKey(bucket.weeklyProgressReports ?? bucket.progressReports) ||
    idsKey(nextDailyReports) !== idsKey(bucket.dailyProgressReports)

  return {
    changed,
    files: {
      ...bucket,
      daily: nextDaily,
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
