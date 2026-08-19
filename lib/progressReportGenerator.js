import { addDays, parseDayId, weekIdFromStart } from "@/lib/weeklyFiles"

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function formatShortDate(date) {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function formatWeekRangeFromDates(startDate, endDate) {
  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()

  if (sameMonth) {
    return `${startDate.getDate()}–${endDate.getDate()} ${SHORT_MONTHS[endDate.getMonth()]} ${endDate.getFullYear()}`
  }

  return `${startDate.getDate()} ${SHORT_MONTHS[startDate.getMonth()]} – ${endDate.getDate()} ${SHORT_MONTHS[endDate.getMonth()]} ${endDate.getFullYear()}`
}

/**
 * Progress report IDs match weekly valuation file IDs (Monday of each project week).
 */
export function generateProgressReportId(date = new Date(), projectStart = null) {
  const start = projectStart ? startOfDay(projectStart) : startOfDay(new Date(2025, 0, 1))
  const day = startOfDay(date)
  const diffDays = Math.max(0, Math.floor((day - start) / (1000 * 60 * 60 * 24)))
  const weekIndex = Math.floor(diffDays / 7)
  const weekStart = addDays(start, weekIndex * 7)
  return weekIdFromStart(weekStart)
}

/**
 * Get date range for a progress report / weekly file ID like "2025-01-06"
 */
export function getWeekDateRange(weekId) {
  if (weekId.includes("-W")) {
    const [year, weekStr] = weekId.split("-W")
    const week = parseInt(weekStr, 10)
    const yearNum = parseInt(year, 10)
    const simple = new Date(yearNum, 0, 1 + (week - 1) * 7)
    const monday = new Date(simple)
    const day = monday.getDay()
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
    monday.setDate(diff)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    return { startDate: monday, endDate: sunday }
  }

  const startDate = parseDayId(weekId)
  const endDate = addDays(startDate, 6)
  return { startDate, endDate }
}

/**
 * Format week range label like "22–28 Jul 2026"
 */
export function formatWeekRange(weekId) {
  const { startDate, endDate } = getWeekDateRange(weekId)
  return formatWeekRangeFromDates(startDate, endDate)
}

/**
 * Create a blank progress report for a project week.
 */
export function createBlankProgressReport(weekId, { inProgress = false, weekStart, weekEnd, weekNumber } = {}) {
  const id = weekId
  const rangeLabel =
    weekStart && weekEnd ? formatWeekRangeFromDates(weekStart, weekEnd) : formatWeekRange(id)

  return {
    id,
    label: `Progress Report - ${rangeLabel}`,
    weekRange: rangeLabel,
    weekNumber: weekNumber ?? null,
    createdAt: new Date().toISOString(),
    completedAt: inProgress
      ? null
      : formatShortDate(addDays(weekEnd ?? getWeekDateRange(id).endDate, 1)),
    progressSummary: "",
    progressUpdate: {
      content: "",
      attachments: [],
      photos: [],
      updatedAt: new Date().toISOString(),
    },
    attachments: [],
    status: inProgress ? "in-progress" : "completed",
  }
}

/**
 * Generate weekly progress reports from project start through today.
 */
export function generateProgressReports(projectStart, throughDay) {
  const files = []
  let weekNumber = 1
  let weekStart = startOfDay(projectStart)
  const end = startOfDay(throughDay)
  const today = startOfDay(new Date())

  while (weekStart <= end) {
    const weekEnd = addDays(weekStart, 6)
    const inProgress = weekEnd >= today

    files.push(
      createBlankProgressReport(weekIdFromStart(weekStart), {
        weekStart,
        weekEnd,
        weekNumber,
        inProgress,
      })
    )

    if (inProgress) {
      break
    }

    weekStart = addDays(weekStart, 7)
    weekNumber += 1
  }

  return files.reverse()
}
