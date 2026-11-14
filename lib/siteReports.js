import { getDayIdsInMonth, getDayIdsInWeek } from "@/lib/projectData"
import {
  getSheqIncidentDailyFiles,
  getSheqIncidentDescriptionText,
  getSheqIncidentReport,
  SHEQ_INCIDENT_TYPES,
} from "@/lib/sheqIncident"

export const SITE_REPORT_PERIODS = [
  {
    period: "daily",
    label: "Daily",
    description: "That day’s valuations, materials, equipment, fuel, and incidents, with the weather at the top.",
    icon: "clock",
  },
  {
    period: "weekly",
    label: "Weekly",
    description: "The same site diary rolled across the 7-day project week.",
    icon: "calendar-range",
  },
  {
    period: "monthly",
    label: "Monthly",
    description: "The same site diary rolled across the project month.",
    icon: "calendar-days",
  },
]

export function isSiteReportPeriod(period) {
  return SITE_REPORT_PERIODS.some((item) => item.period === period)
}

export function getSiteReportDayIds(projectId, period, fileId) {
  if (period === "weekly") return getDayIdsInWeek(projectId, fileId)
  if (period === "monthly") return getDayIdsInMonth(projectId, fileId)
  return fileId ? [fileId] : []
}

function incidentTypeLabel(value) {
  const match = SHEQ_INCIDENT_TYPES.find((item) => item.value === value)
  return match?.label || String(value || "").trim() || "Incident"
}

/** SHEQ incident files whose day falls in this daily, weekly, or monthly period. */
export function getSiteReportIncidents(projectId, dayIds) {
  const days = new Set(dayIds || [])
  if (!projectId || days.size === 0) return []

  return getSheqIncidentDailyFiles(projectId)
    .filter((file) => days.has(file.dayId))
    .map((file) => {
      const report = getSheqIncidentReport(projectId, file.id)
      return {
        id: file.id,
        dayId: file.dayId,
        dateLabel: file.dateLabel || file.label || file.dayId,
        type: incidentTypeLabel(report.incidentType),
        person: String(report.injuredName || "").trim(),
        location: String(report.locationOnSite || "").trim(),
        description: getSheqIncidentDescriptionText(report),
      }
    })
}
