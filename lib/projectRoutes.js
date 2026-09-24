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
  "qs-engineering": {
    label: "QS & Engineering",
    description: "Valuations, plant on site, progress reports, and rate analysis",
    icon: "hard-hat",
  },
  finance: {
    label: "Finance",
    description: "Petty cash and goods received",
    icon: "wallet",
  },
  "petty-cash": {
    label: "Petty cash",
    description: "Record and track petty cash for this project",
    icon: "banknote",
  },
  "goods-received": {
    label: "Goods received",
    description: "Record goods received for this project",
    icon: "package",
  },
  "safety-health": {
    label: "Safety & Health",
    description: "Site staff attendance and safety modules",
    icon: "shield",
  },
}

export const PROJECT_HOME_HUBS = [
  {
    view: "qs-engineering",
    label: "QS & Engineering",
    description: "Valuations, plant on site, progress reports, and rate analysis",
    icon: "hard-hat",
    iconClassName: "app-icon-tile--orange",
  },
  {
    view: "finance",
    label: "Finance",
    description: "Petty cash and goods received",
    icon: "wallet",
    iconClassName: "app-icon-tile--emerald",
  },
  {
    view: "safety-health",
    label: "Safety & Health",
    description: "Site staff attendance and safety modules",
    icon: "shield",
    iconClassName: "app-icon-tile--blue",
  },
]

export const FINANCE_MODULES = [
  {
    view: "petty-cash",
    label: "Petty cash",
    description: "Record and track petty cash for this project",
    icon: "banknote",
  },
  {
    view: "goods-received",
    label: "Goods received",
    description: "Record goods received for this project",
    icon: "package",
  },
]

export const PETTY_CASH_PERIODS = [
  {
    period: "daily",
    label: "Daily petty cash",
    description: "Daily petty cash records from project start",
    icon: "clock",
  },
  {
    period: "weekly",
    label: "Weekly petty cash",
    description: "Weekly petty cash summaries in 7-day periods",
    icon: "calendar-range",
  },
  {
    period: "monthly",
    label: "Monthly petty cash",
    description: "Monthly petty cash summaries from project start",
    icon: "calendar-days",
  },
  {
    period: "project-to-date",
    label: "Project to date",
    description: "Petty cash totals for the whole project",
    icon: "hard-hat",
  },
]

export const GOODS_RECEIVED_PERIODS = [
  {
    period: "daily",
    label: "Daily goods received",
    description: "Daily goods received records from project start",
    icon: "clock",
  },
  {
    period: "weekly",
    label: "Weekly goods received",
    description: "Weekly goods received summaries in 7-day periods",
    icon: "calendar-range",
  },
  {
    period: "monthly",
    label: "Monthly goods received",
    description: "Monthly goods received summaries from project start",
    icon: "calendar-days",
  },
  {
    period: "project-to-date",
    label: "Project to date",
    description: "Goods received totals for the whole project",
    icon: "hard-hat",
  },
]

export const PPE_RECEIVED_PERIODS = [
  {
    period: "daily",
    label: "Daily PPE received",
    description: "Create dated daily files with +, then enter PPE received for that day",
    icon: "clock",
  },
  {
    period: "project-to-date",
    label: "Project to date",
    description: "Cumulative PPE received quantities and costs for the whole project",
    icon: "hard-hat",
  },
]

export const PPE_ISSUED_PERIODS = [
  {
    period: "daily",
    label: "Daily PPE issued",
    description: "Create dated daily files with +, then enter PPE issued for that day",
    icon: "clock",
  },
  {
    period: "project-to-date",
    label: "Project to date",
    description: "Cumulative PPE issued quantities and costs for the whole project",
    icon: "hard-hat",
  },
]

export const QS_ENGINEERING_MODULES = [
  {
    view: "valuations",
    label: "Valuations",
    description: "Open earned value dashboards for project, monthly, weekly, and daily reports",
    icon: "chart-bar",
  },
  {
    view: "plant-on-site",
    label: "Plant on Site",
    description: "Register plant operators, record plant hours, and track fuel costs",
    icon: "truck",
  },
  {
    view: "progress-reports",
    label: "Progress Reports",
    description: "Weekly progress summaries with target plans and attachments",
    icon: "file-text",
  },
  {
    view: "rate-analysis",
    label: "Rate Analysis",
    description: "Daily, weekly, and monthly plant rates compared against Excel BOQ items",
    icon: "chart-bar",
  },
]

export function getProjectHomeHref(projectId) {
  return `/project/${projectId}`
}

export function getDashboardHref(projectId, view) {
  return `/project/${projectId}/dashboard/${view}`
}

export function getQsEngineeringHref(projectId) {
  return getDashboardHref(projectId, "qs-engineering")
}

export function getFinanceHref(projectId) {
  return getDashboardHref(projectId, "finance")
}

export function getPettyCashHref(projectId) {
  return getDashboardHref(projectId, "petty-cash")
}

export function getPettyCashPeriodHref(projectId, period) {
  return `${getPettyCashHref(projectId)}/${period}`
}

export function getPettyCashDailyHref(projectId) {
  return getPettyCashPeriodHref(projectId, "daily")
}

export function getPettyCashDailyFileHref(projectId, dayId) {
  return `${getPettyCashDailyHref(projectId)}/${dayId}`
}

export function getPettyCashEntryHref(projectId, dayId) {
  return `${getPettyCashDailyFileHref(projectId, dayId)}/entry`
}

export function getGoodsReceivedHref(projectId) {
  return getDashboardHref(projectId, "goods-received")
}

export function getGoodsReceivedPeriodHref(projectId, period) {
  return `${getGoodsReceivedHref(projectId)}/${period}`
}

export function getGoodsReceivedDailyHref(projectId) {
  return getGoodsReceivedPeriodHref(projectId, "daily")
}

export function getGoodsReceivedDailyFileHref(projectId, dayId) {
  return `${getGoodsReceivedDailyHref(projectId)}/${dayId}`
}

export function getGoodsReceivedEntryHref(projectId, dayId) {
  return `${getGoodsReceivedDailyFileHref(projectId, dayId)}/entry`
}

export function getSafetyHealthHref(projectId) {
  return getDashboardHref(projectId, "safety-health")
}

export function getPpeRegistersHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/ppe-registers`
}

export function getSiteStaffRegistersHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/site-staff`
}

export function getSiteStaffRegisterHref(projectId, monthId) {
  return `/project/${projectId}/dashboard/safety-health/site-staff/${monthId}`
}

export function getPersonalProtectiveEquipmentHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/ppe`
}

export function getSafetyReportsHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/safety-reports`
}

export function getSheqSiteInspectionReportHref(projectId) {
  return `${getSafetyReportsHref(projectId)}/sheq-site-inspection`
}

export function getSheqSiteInspectionPeriodHref(projectId, period) {
  return `${getSheqSiteInspectionReportHref(projectId)}/${period}`
}

export function getSheqSiteInspectionFileHref(projectId, period, periodId) {
  return `${getSheqSiteInspectionPeriodHref(projectId, period)}/${periodId}`
}

export const SHEQ_SITE_INSPECTION_PERIOD_OPTIONS = [
  {
    period: "daily",
    label: "Daily site inspection",
    description: "Daily SHEQ site inspection report files from project start",
    icon: "clock",
  },
  {
    period: "weekly",
    label: "Weekly site inspection",
    description: "Weekly SHEQ site inspection report files",
    icon: "calendar-range",
  },
  {
    period: "monthly",
    label: "Monthly site inspection",
    description: "Monthly SHEQ site inspection report files",
    icon: "calendar-days",
  },
]

export function getSheqIncidentReportHref(projectId) {
  return `${getSafetyReportsHref(projectId)}/sheq-incident`
}

export function getSheqIncidentDailyFileHref(projectId, dayId) {
  return `${getSheqIncidentReportHref(projectId)}/${dayId}`
}

export function getSheqWeeklyReportHref(projectId) {
  return `${getSafetyReportsHref(projectId)}/the-sheq-weekly-report`
}

export function getSheqWeeklyReportVariantHref(projectId, variant) {
  return `${getSheqWeeklyReportHref(projectId)}/${variant}`
}

export function getSheqWeeklyReportFileHref(projectId, weekId, variant = "actual") {
  return `${getSheqWeeklyReportVariantHref(projectId, variant)}/${weekId}`
}

export const SHEQ_WEEKLY_REPORT_OPTIONS = [
  {
    variant: "actual",
    label: "Actual Progress Report",
    description:
      "Weekly training workforce, automatic incident summary, and SHEQ document with Major Highlight",
    icon: "file-text",
  },
  {
    variant: "target",
    label: "Target Weekly SHEQ report",
    description: "Word-style document platform for this week’s target SHEQ plan",
    icon: "file-text",
  },
]

export const SAFETY_REPORTS_OPTIONS = [
  {
    key: "sheq-site-inspection",
    label: "SHEQ site inspection report",
    description: "Site inspection reports for SHEQ compliance and findings",
    icon: "file-text",
    href: getSheqSiteInspectionReportHref,
  },
  {
    key: "sheq-incident",
    label: "SHEQ Incident report",
    description: "Daily incident reports with injury details and photos",
    icon: "triangle-alert",
    href: getSheqIncidentReportHref,
  },
  {
    key: "the-sheq-weekly-report",
    label: "THE SHEQ WEEKLY REPORT",
    description: "Actual and Target weekly SHEQ reports",
    icon: "calendar-range",
    href: getSheqWeeklyReportHref,
  },
]

export function getInductionRegistersHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/induction`
}

export function getInductionRegisterHref(projectId, monthId) {
  return `/project/${projectId}/dashboard/safety-health/induction/${monthId}`
}

export const PPE_REGISTERS_OPTIONS = [
  {
    key: "site-staff",
    label: "Site Staff attendance register",
    description:
      "Monthly attendance for site staff — name, role, and day boxes for present or absent",
    icon: "users",
    href: getSiteStaffRegistersHref,
  },
  {
    key: "induction",
    label: "Induction register",
    description:
      "Monthly induction registers with name, ID number, phone number, position, and company name",
    icon: "file-text",
    href: getInductionRegistersHref,
  },
]

export function getPpeReceivedHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/ppe-received`
}

export function getPpeReceivedPeriodHref(projectId, period) {
  return `${getPpeReceivedHref(projectId)}/${period}`
}

export function getPpeReceivedDailyHref(projectId) {
  return getPpeReceivedPeriodHref(projectId, "daily")
}

export function getPpeReceivedDailyFileHref(projectId, dayId) {
  return `${getPpeReceivedDailyHref(projectId)}/${dayId}`
}

export function getPpeReceivedEntryHref(projectId, dayId) {
  return `${getPpeReceivedDailyFileHref(projectId, dayId)}/entry`
}

export function getPpeIssuedHref(projectId) {
  return `/project/${projectId}/dashboard/safety-health/ppe-issued`
}

export function getPpeIssuedPeriodHref(projectId, period) {
  return `${getPpeIssuedHref(projectId)}/${period}`
}

export function getPpeIssuedDailyHref(projectId) {
  return getPpeIssuedPeriodHref(projectId, "daily")
}

export function getPpeIssuedDailyFileHref(projectId, dayId) {
  return `${getPpeIssuedDailyHref(projectId)}/${dayId}`
}

export function getPpeIssuedEntryHref(projectId, dayId) {
  return `${getPpeIssuedDailyFileHref(projectId, dayId)}/entry`
}

export const PERSONAL_PROTECTIVE_EQUIPMENT_OPTIONS = [
  {
    key: "ppe-received",
    label: "PPE received",
    description: "Daily, weekly, monthly, and project-to-date PPE received records and rollups",
    icon: "package",
    href: getPpeReceivedHref,
  },
  {
    key: "ppe-issued",
    label: "PPE issued",
    description: "Daily, weekly, monthly, and project-to-date PPE issued records and rollups",
    icon: "hard-hat",
    href: getPpeIssuedHref,
  },
]

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
