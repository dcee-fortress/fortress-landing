import { getResolvedDailyFiles } from "@/lib/dailyFileSync"
import {
  resolveMonthlyFiles,
  resolveWeeklyFiles,
  shouldShowMonthlyFile,
  shouldShowWeeklyFile,
} from "@/lib/periodFiles"
import { getCustomProjectFiles } from "@/lib/projectRegistry"
import { isSeededProject } from "@/lib/projectList"

export const MONTHLY_FILES = {}

export const WEEKLY_FILES = {}

export const DAILY_FILES = {}

export function getMonthlyFiles(projectId) {
  let base = []

  if (isSeededProject(projectId)) {
    base = MONTHLY_FILES[projectId] ?? []
  } else if (typeof window !== "undefined") {
    base = getCustomProjectFiles(projectId)?.monthly ?? []
  }

  const files = resolveMonthlyFiles(projectId, base)

  if (typeof window === "undefined") {
    return files
  }

  return files.filter((file) => shouldShowMonthlyFile(projectId, file))
}

export function getMonthlyFile(projectId, monthId) {
  return getMonthlyFiles(projectId).find((file) => file.id === monthId) ?? null
}

export function getWeeklyFiles(projectId) {
  let base = []

  if (isSeededProject(projectId)) {
    base = WEEKLY_FILES[projectId] ?? []
  } else if (typeof window !== "undefined") {
    base = getCustomProjectFiles(projectId)?.weekly ?? []
  }

  const files = resolveWeeklyFiles(projectId, base)

  if (typeof window === "undefined") {
    return files
  }

  return files.filter((file) => shouldShowWeeklyFile(projectId, file))
}

export function getWeeklyFile(projectId, weekId) {
  return getWeeklyFiles(projectId).find((file) => file.id === weekId) ?? null
}

export function getDailyFiles(projectId) {
  let base = []

  if (isSeededProject(projectId)) {
    base = DAILY_FILES[projectId] ?? []
  } else if (typeof window !== "undefined") {
    base = getCustomProjectFiles(projectId)?.daily ?? []
  }

  return getResolvedDailyFiles(projectId, base)
}

export function getDailyFile(projectId, dayId) {
  return getDailyFiles(projectId).find((file) => file.id === dayId) ?? null
}
