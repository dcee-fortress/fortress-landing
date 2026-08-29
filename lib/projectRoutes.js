export const DASHBOARD_VIEWS = {
  "project-to-date": {
    label: "Project to date valuations",
    description: "Main activity, actual cost on site, and production totals",
    icon: "hard-hat",
  },
  "monthly-value": {
    label: "Monthly valuations",
    description: "Completed monthly valuation reports from project start",
    icon: "calendar-days",
  },
  "weekly-value": {
    label: "Weekly valuations",
    description: "Completed weekly valuation reports in 7-day periods",
    icon: "calendar-range",
  },
  "daily-value": {
    label: "Daily valuations",
    description: "Completed daily valuation reports from project start",
    icon: "clock",
  },
  "progress-reports": {
    label: "Progress Reports",
    description: "Weekly progress summaries with target plans and attachments",
    icon: "file-text",
  },
  "rate-analysis": {
    label: "Rate Analysis",
    description: "Daily, weekly, and monthly plant rates compared against Excel BOQ items",
    icon: "chart-bar",
  },
  valuations: {
    label: "Valuations",
    description: "Open earned value dashboards for project, monthly, weekly, and daily reports",
    icon: "chart-bar",
  },
  "plant-on-site": {
    label: "Plant on Site",
    description: "Register plant operators, record plant hours, and track fuel costs",
    icon: "truck",
  },
}

export function getProjectHomeHref(projectId) {
  return `/project/${projectId}`
}

export function getDashboardHref(projectId, view) {
  return `/project/${projectId}/dashboard/${view}`
}

export function getDailyValueHref(projectId) {
  return getDashboardHref(projectId, "daily-value")
}

export function getDailyFileHref(projectId, dayId) {
  return `/project/${projectId}/dashboard/daily-value/${dayId}`
}

export function getWeeklyValueHref(projectId) {
  return getDashboardHref(projectId, "weekly-value")
}

export function getWeeklyFileHref(projectId, weekId) {
  return `/project/${projectId}/dashboard/weekly-value/${weekId}`
}

export function getMonthlyValueHref(projectId) {
  return getDashboardHref(projectId, "monthly-value")
}

export function getMonthlyFileHref(projectId, monthId) {
  return `/project/${projectId}/dashboard/monthly-value/${monthId}`
}

export function getProgressReportsHref(projectId) {
  return getDashboardHref(projectId, "progress-reports")
}

export function getWeeklyProgressReportsHref(projectId) {
  return `/project/${projectId}/dashboard/progress-reports/weekly`
}

export function getPlantOnSiteHref(projectId) {
  return getDashboardHref(projectId, "plant-on-site")
}

export function getPlantOperatorsHref(projectId) {
  return `/project/${projectId}/dashboard/plant-on-site/plant-operators`
}

export function getPlantHoursHref(projectId) {
  return `/project/${projectId}/dashboard/plant-on-site/plant-hours`
}

export function getPlantCostHref(projectId) {
  return `/project/${projectId}/dashboard/plant-on-site/plant-cost`
}

export function getEquipmentInUseHref(projectId) {
  return `/project/${projectId}/dashboard/plant-on-site/equipment-in-use`
}

export function getProgressReportFileHref(projectId, reportId) {
  return `/project/${projectId}/dashboard/progress-reports/${reportId}`
}

export function getDailyProgressReportFileHref(projectId, reportId) {
  return getProgressReportFileHref(projectId, reportId)
}

export function getWeeklyProgressReportFileHref(projectId, reportId) {
  return `/project/${projectId}/dashboard/progress-reports/weekly/${reportId}`
}

export function getActualProgressUpdateHref(projectId, reportId) {
  return `/project/${projectId}/dashboard/progress-reports/${reportId}/actual-progress-update`
}

export function isValidDashboardView(view) {
  return view in DASHBOARD_VIEWS
}
