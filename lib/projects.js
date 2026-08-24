import {
  DAILY_FILES,
  getDailyFile,
  getDailyFiles,
  getMonthlyFile,
  getMonthlyFiles,
  getWeeklyFile,
  getWeeklyFiles,
  MONTHLY_FILES,
  WEEKLY_FILES,
} from "@/lib/projectFiles"
import {
  ensureProgressReportsExist,
  getProjectProgressReports,
} from "@/lib/progressReports"
import { getProjectById } from "@/lib/projectList"

export {
  DEFAULT_PROJECT_ID,
  PROJECTS,
  getAllProjects,
  getProjectById,
  getProjectForRoute,
  isActiveProject,
  isSeededProject,
} from "@/lib/projectList"
export {
  DASHBOARD_VIEWS,
  getActualProgressUpdateHref,
  getDailyFileHref,
  getDailyValueHref,
  getDashboardHref,
  getEquipmentInUseHref,
  getMonthlyFileHref,
  getMonthlyValueHref,
  getPlantCostHref,
  getPlantHoursHref,
  getPlantOnSiteHref,
  getPlantOperatorsHref,
  getProgressReportFileHref,
  getProgressReportsHref,
  getProjectHomeHref,
  getWeeklyFileHref,
  getWeeklyValueHref,
  isValidDashboardView,
} from "@/lib/projectRoutes"

export const PROJECT_START = { month: 1, year: 2025 }

export { DAILY_FILES, MONTHLY_FILES, WEEKLY_FILES }

export const PROJECT_DASHBOARDS = {}

export function getProjectDashboard(id) {
  if (PROJECT_DASHBOARDS[id]) {
    return PROJECT_DASHBOARDS[id]
  }

  const project = getProjectById(id)
  if (!project) return null

  return {
    mainActivity: {
      title: "Main Activity on Site",
      description: `General construction and site works for ${project.name}. Activity details will appear here once measurements and cost data are recorded.`,
      status: "Pending",
      lastUpdated: "—",
    },
    financialSummary: [],
    targetCost: 0,
    actualMeasuredWork: 0,
    actualCostIncurred: 0,
    monthlyValue: {
      period: "June 2026",
      targetEarned: 0,
      measuredWork: 0,
      valueEarned: 0,
    },
    weeklyValue: {
      period: "Current week",
      targetEarned: 0,
      measuredWork: 0,
      valueEarned: 0,
    },
    dailyValue: {
      date: "28 Jun 2026",
      targetEarned: 0,
      measuredWork: 0,
      valueEarned: 0,
    },
  }
}

export {
  getDailyFile,
  getDailyFiles,
  getMonthlyFile,
  getMonthlyFiles,
  getWeeklyFile,
  getWeeklyFiles,
}

export function getProgressReportFiles(projectId) {
  if (typeof window !== "undefined") {
    ensureProgressReportsExist(projectId)
    return getProjectProgressReports(projectId)
  }

  return []
}

export function getProgressReportFile(projectId, reportId) {
  return getProgressReportFiles(projectId).find((file) => file.id === reportId) ?? null
}

export { formatCurrency } from "@/lib/formatCurrency"

export function getProjectToDateSummary(dashboard) {
  const rows = (dashboard.financialSummary ?? []).map((item) => {
    const variance = item.actualCostIncurred - item.actualMeasuredWork

    return {
      description: item.description,
      targetCost: item.targetCost,
      actualMeasuredWork: item.actualMeasuredWork,
      actualCostIncurred: item.actualCostIncurred,
      variance,
      varianceLabel:
        variance > 0
          ? "Over measured work"
          : variance < 0
            ? "Under measured work"
            : "On target",
    }
  })

  const totals = rows.reduce(
    (acc, row) => ({
      targetCost: acc.targetCost + row.targetCost,
      actualMeasuredWork: acc.actualMeasuredWork + row.actualMeasuredWork,
      actualCostIncurred: acc.actualCostIncurred + row.actualCostIncurred,
    }),
    { targetCost: 0, actualMeasuredWork: 0, actualCostIncurred: 0 }
  )

  const totalVariance = totals.actualCostIncurred - totals.actualMeasuredWork

  return {
    rows,
    totals: {
      ...totals,
      variance: totalVariance,
      varianceLabel:
        totalVariance > 0
          ? "Over measured work"
          : totalVariance < 0
            ? "Under measured work"
            : "On target",
    },
  }
}
