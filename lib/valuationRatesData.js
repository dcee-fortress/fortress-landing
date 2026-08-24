import {
  getDayIdsInMonth,
  getDayIdsInWeek,
  getDaySummary,
  getMonthSummary,
  getProjectStoreDayIds,
  getSummaryForDayIds,
  getWeekSummary,
} from "@/lib/projectData"
import { getDailyFiles } from "@/lib/projects"
import { calculateEarnedValueRate } from "@/lib/earnedValueTable"

function getDayIdsForPeriod(projectId, period, fileId) {
  if (period === "project-to-date") {
    return getProjectStoreDayIds(projectId)
  }
  if (period === "weekly") return getDayIdsInWeek(projectId, fileId)
  if (period === "monthly") return getDayIdsInMonth(projectId, fileId)
  return [fileId]
}

function getDashboardSummaryForPeriod(projectId, period, fileId) {
  if (period === "daily") {
    return getDaySummary(projectId, fileId)
  }
  if (period === "weekly") {
    return getWeekSummary(projectId, fileId)
  }
  if (period === "monthly") {
    return getMonthSummary(projectId, fileId)
  }
  if (period === "project-to-date") {
    const dayIds = getProjectStoreDayIds(projectId)
    return getSummaryForDayIds(projectId, dayIds)
  }
  return { rows: [], totals: { valueEarned: 0, production: 0 } }
}

function buildRateRowsFromDashboardSummary(summary) {
  return summary.rows
    .filter(
      (row) =>
        row.description?.trim() &&
        ((row.valueEarned ?? 0) > 0 || (row.production ?? 0) > 0)
    )
    .map((row) => {
      const totalCost = row.valueEarned ?? 0
      const production = row.production ?? 0

      return {
        activityDescription: row.description.trim(),
        actualRate: calculateEarnedValueRate(totalCost, production),
        totalCost,
        production,
        unit: "",
      }
    })
    .sort((left, right) => left.activityDescription.localeCompare(right.activityDescription))
}

function buildTotalsFromDashboardSummary(summary) {
  const totalCost = summary.totals.valueEarned ?? 0
  const production = summary.totals.production ?? 0

  return {
    totalCost,
    production,
    actualRate: calculateEarnedValueRate(totalCost, production),
  }
}

function countDaysWithEntries(projectId, dayIds) {
  const savedDayIds = new Set(getProjectStoreDayIds(projectId))
  return dayIds.filter((dayId) => savedDayIds.has(dayId)).length
}

export function getValuationRatesPeriodSummary(projectId, period, fileId) {
  const dayIds = getDayIdsForPeriod(projectId, period, fileId)
  const dashboardSummary = getDashboardSummaryForPeriod(projectId, period, fileId)

  return {
    period,
    fileId,
    dayIds:
      period === "project-to-date"
        ? getDailyFiles(projectId).map((file) => file.id)
        : dayIds,
    daysWithEntries: countDaysWithEntries(projectId, dayIds),
    rows: buildRateRowsFromDashboardSummary(dashboardSummary),
    totals: buildTotalsFromDashboardSummary(dashboardSummary),
  }
}
