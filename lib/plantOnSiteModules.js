import {
  getDailyFile,
  getDailyFiles,
  getMonthlyFile,
  getMonthlyFiles,
  getWeeklyFile,
  getWeeklyFiles,
} from "@/lib/projects"

export const PLANT_ON_SITE_PERIODS = ["daily", "weekly", "monthly"]

export const PLANT_COST_PERIODS = ["daily", "weekly", "monthly", "project-to-date"]

export const PLANT_ON_SITE_PERIOD_MODULE_KEYS = [
  "plant-hours",
  "plant-cost",
  "fuel-cost",
  "equipment-in-use",
]

export const PLANT_HOURS_MODULE = {
  key: "plant-hours",
  title: "Plant Hours",
  hubDescription:
    "Record working hours, standby time, and utilisation for plant on site by day, week, or month.",
  hubIcon: "clock",
  filePrefix: "Plant Hours",
  inProgressText: "Plant hours being recorded",
  detailDescription:
    "Record plant hours in daily files. Weekly and monthly views roll up automatically from daily entries.",
  rowIcon: "clock",
  accentIconClass: "bg-orange-50 text-orange-700 group-hover:bg-orange-100",
  periodListDescriptions: {
    daily:
      "Open a daily file to record plant hours. Weekly and monthly summaries are calculated automatically from these daily entries.",
    weekly:
      "Weekly totals are calculated automatically from daily plant hours entries for each day in the project week.",
    monthly:
      "Monthly totals are calculated automatically from daily plant hours entries for each day in the calendar month.",
  },
}

export const PLANT_COST_MODULE = {
  key: "plant-cost",
  title: "Plant Cost",
  hubDescription:
    "Track fuel, hire, and daily plant rates for equipment on site by day, week, or month.",
  hubIcon: "fuel",
  filePrefix: "Plant Cost",
  inProgressText: "Plant cost entries being recorded",
  detailDescription:
    "Daily rates roll up from hourly dashboards. Fuel cost, hire cost, and daily rate are calculated automatically.",
  rowIcon: "fuel",
  accentIconClass: "bg-orange-50 text-orange-700 group-hover:bg-orange-100",
  periodListDescriptions: {
    daily:
      "Open a daily file for daily rates. Add hourly dashboards, save plant cost material schedules, and the daily rate is calculated automatically.",
    weekly:
      "Weekly rates roll up automatically from daily hourly plant cost entries for this project week.",
    monthly:
      "Monthly rates roll up automatically from daily hourly plant cost entries for this calendar month.",
    "project-to-date":
      "Project to date rates roll up automatically from all daily hourly plant cost entries from project start.",
  },
}

export const EQUIPMENT_IN_USE_MODULE = {
  key: "equipment-in-use",
  title: "Equipment in Use",
  hubDescription:
    "View equipment marked in use from the operator register and record start and finish hours. Hours cumulate daily from project start to date.",
  hubIcon: "hard-hat",
  filePrefix: "Equipment in Use",
  inProgressText: "Equipment hours being recorded",
  detailDescription:
    "Equipment is listed from register ticks marked present. Enter start and finish hours — hours operating calculates automatically.",
  rowIcon: "hard-hat",
  accentIconClass: "bg-orange-50 text-orange-700 group-hover:bg-orange-100",
  periodListDescriptions: {
    daily:
      "Open a daily file to enter start and finish hours for equipment marked present in the register.",
    weekly:
      "Weekly equipment hours roll up automatically from daily hour entries across the project week.",
    monthly:
      "Monthly equipment hours roll up automatically from daily hour entries across the calendar month.",
  },
}

export const PERIOD_OPTIONS = [
  {
    period: "daily",
    label: "Daily Plant Records",
    shortLabel: "Daily",
    description: "Daily files created automatically each day from project start",
    icon: "clock",
    listTitle: "Daily Files",
    listDescription:
      "A new daily file is created automatically each day. Open today’s file to record plant hours or plant costs.",
    searchPlaceholder: "Search daily files by date or id…",
    emptySearch: "No daily files match your search.",
    emptyList: "No daily files yet. They will be created automatically each day from project start.",
  },
  {
    period: "weekly",
    label: "Weekly Plant Records",
    shortLabel: "Weekly",
    description: "Weekly files aligned to project weeks from project start",
    icon: "calendar-range",
    listTitle: "Weekly Files",
    listDescription:
      "Weekly files roll up by project week. In-progress weeks update as daily records are saved.",
    searchPlaceholder: "Search weekly files by week range or id…",
    emptySearch: "No weekly files match your search.",
    emptyList: "No weekly files yet. They will be created automatically each project week.",
  },
  {
    period: "monthly",
    label: "Monthly Plant Records",
    shortLabel: "Monthly",
    description: "Monthly files created automatically each month from project start",
    icon: "calendar-days",
    listTitle: "Monthly Files",
    listDescription:
      "Monthly files summarise plant activity by calendar month. In-progress months update as records are saved.",
    searchPlaceholder: "Search monthly files by month, year, or id…",
    emptySearch: "No monthly files match your search.",
    emptyList: "No monthly files yet. They will be created automatically each month from project start.",
  },
]

export const PLANT_COST_PERIOD_OPTIONS = [
  ...PERIOD_OPTIONS,
  {
    period: "project-to-date",
    label: "Project to Date Rates",
    shortLabel: "Project to Date",
    description: "Rates rolled up from all daily hourly entries from project start",
    icon: "hard-hat",
    listTitle: "Project to Date",
    listDescription:
      "Project to date rates roll up from all daily hourly plant cost material schedules saved from project start.",
    searchPlaceholder: "",
    emptySearch: "",
    emptyList: "",
  },
]

export function getPlantCostProjectToDateHref(projectId) {
  return `/project/${projectId}/dashboard/plant-on-site/plant-cost/project-to-date`
}

export function getModulePeriodOptions(module) {
  if (module.key === "plant-cost" || module.key === "fuel-cost") {
    return PLANT_COST_PERIOD_OPTIONS
  }
  return PERIOD_OPTIONS
}

export function getModulePeriodHref(projectId, module, period) {
  if (period === "project-to-date" && (module.key === "plant-cost" || module.key === "fuel-cost")) {
    return getPlantCostProjectToDateHref(projectId)
  }
  return getPlantOnSitePeriodHref(projectId, module.key, period)
}

export function getPlantOnSiteModuleHref(projectId, moduleKey) {
  return `/project/${projectId}/dashboard/plant-on-site/${moduleKey}`
}

export function getPlantOnSitePeriodHref(projectId, moduleKey, period) {
  return `/project/${projectId}/dashboard/plant-on-site/${moduleKey}/${period}`
}

export function getPlantOnSitePeriodFileHref(projectId, moduleKey, period, fileId) {
  return `/project/${projectId}/dashboard/plant-on-site/${moduleKey}/${period}/${fileId}`
}

export function getPeriodFiles(projectId, period) {
  if (period === "daily") return getDailyFiles(projectId)
  if (period === "weekly") return getWeeklyFiles(projectId)
  return getMonthlyFiles(projectId)
}

export function getPeriodFile(projectId, period, fileId) {
  if (period === "daily") return getDailyFile(projectId, fileId)
  if (period === "weekly") return getWeeklyFile(projectId, fileId)
  return getMonthlyFile(projectId, fileId)
}

export function formatPlantOnSiteFileLabel(module, file) {
  return `${module.filePrefix} - ${file.label}`
}

export function getPeriodOption(period, module) {
  const options =
    module?.key === "plant-cost" || module?.key === "fuel-cost"
      ? PLANT_COST_PERIOD_OPTIONS
      : PERIOD_OPTIONS
  return options.find((option) => option.period === period) ?? PERIOD_OPTIONS[0]
}

export function getModulePeriodListDescription(module, period) {
  return module.periodListDescriptions?.[period] ?? getPeriodOption(period).listDescription
}
