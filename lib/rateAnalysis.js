import { getPeriodFile, getPeriodFiles } from "@/lib/plantOnSiteModules"

export const ACTUAL_RATE_COLUMN_LABEL = "ACTUAL RATE"

export function getActualRateColumnLabel() {
  return ACTUAL_RATE_COLUMN_LABEL
}

export function getMaterialScheduleRateColumnLabel() {
  return ACTUAL_RATE_COLUMN_LABEL
}

export const RATE_ANALYSIS_PERIODS = [
  {
    period: "daily",
    label: "Daily Rates",
    shortLabel: "Daily",
    description: "Daily rates from valuations dashboard cost and production",
    icon: "clock",
    listTitle: "Daily Rate Files",
    listDescription:
      "Open a daily file to compare valuations actual rates against uploaded BOQ for that day.",
    searchPlaceholder: "Search daily rate files by date or id…",
    emptySearch: "No daily rate files match your search.",
    emptyList: "No daily files yet.",
  },
  {
    period: "weekly",
    label: "Weekly Rates",
    shortLabel: "Weekly",
    description: "Weekly rates from valuations dashboard cost and production",
    icon: "calendar-range",
    listTitle: "Weekly Rate Files",
    listDescription:
      "Open a weekly file to compare valuations actual rates against uploaded BOQ for that week.",
    searchPlaceholder: "Search weekly rate files by week range or id…",
    emptySearch: "No weekly rate files match your search.",
    emptyList: "No weekly files yet.",
  },
  {
    period: "monthly",
    label: "Monthly Rates",
    shortLabel: "Monthly",
    description: "Monthly rates from valuations dashboard cost and production",
    icon: "calendar-days",
    listTitle: "Monthly Rate Files",
    listDescription:
      "Open a monthly file to compare valuations actual rates against uploaded BOQ for that month.",
    searchPlaceholder: "Search monthly rate files by month, year, or id…",
    emptySearch: "No monthly rate files match your search.",
    emptyList: "No monthly files yet.",
  },
  {
    period: "project-to-date",
    label: "Project to Date Rates",
    shortLabel: "Project to Date",
    description:
      "Cumulative rates from project to date valuations dashboard cost and production",
    icon: "hard-hat",
    listTitle: "Project to Date",
    listDescription:
      "Project to date actual rates use cumulative valuations dashboard cost ÷ production.",
    searchPlaceholder: "",
    emptySearch: "",
    emptyList: "",
  },
]

export function getRateAnalysisHubHref(projectId) {
  return `/project/${projectId}/dashboard/rate-analysis`
}

export function getRateAnalysisPeriodHref(projectId, period) {
  if (period === "project-to-date") {
    return getRateAnalysisDetailHref(projectId, period, "project-to-date")
  }
  return `/project/${projectId}/dashboard/rate-analysis/${period}`
}

export function getRateAnalysisDetailHref(projectId, period, fileId) {
  if (period === "project-to-date") {
    return `/project/${projectId}/dashboard/rate-analysis/project-to-date`
  }
  return `/project/${projectId}/dashboard/rate-analysis/${period}/${fileId}`
}

export function getRateAnalysisPeriodFiles(projectId, period) {
  if (period === "project-to-date") {
    return [
      {
        id: "project-to-date",
        label: "Project to Date",
      },
    ]
  }
  return getPeriodFiles(projectId, period)
}

export function formatRateAnalysisFileLabel(file) {
  if (file.id === "project-to-date") return "Rates - Project to Date"
  return `Rates - ${file.label}`
}

export function getRateAnalysisFile(projectId, period, fileId) {
  if (period === "project-to-date" || fileId === "project-to-date") {
    return {
      id: "project-to-date",
      label: "Project to Date",
    }
  }
  return getPeriodFile(projectId, period, fileId)
}

export function isValidRateAnalysisPeriod(period) {
  return RATE_ANALYSIS_PERIODS.some((item) => item.period === period)
}

export function isRateAnalysisFileListPeriod(period) {
  return isValidRateAnalysisPeriod(period) && period !== "project-to-date"
}
