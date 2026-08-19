import { getProjectStartDate } from "@/lib/periodFiles"
import { getProjectEffectiveThroughDate } from "@/lib/projectRegistry"
import { shouldUseDemoValues } from "@/lib/demoMode"
import {
  buildInitialDemoTargetPlan,
  carryForwardProgressReportContent,
  fillDemoProgressReportContent,
  isProgressReportContentEmpty,
  isTargetPlanEmpty,
} from "@/lib/progressReportDemo"
import {
  createBlankProgressReport,
  generateProgressReportId,
  generateProgressReports,
  getWeekDateRange,
  formatWeekRange,
} from "@/lib/progressReportGenerator"
import { readProjectsRegistry, writeProjectsRegistry } from "@/lib/projectRegistry"
import {
  addDays,
  parseDayId,
  weekIdFromStart,
} from "@/lib/weeklyFiles"

export {
  createBlankProgressReport,
  formatWeekRange,
  generateProgressReportId,
  generateProgressReports,
  getWeekDateRange,
} from "@/lib/progressReportGenerator"

export const PROGRESS_REPORTS_STORAGE_KEY = "grove-progress-reports"

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function shouldSeedProgressReportDemo(projectId) {
  return shouldUseDemoValues(projectId)
}

function isReportInProgress(report) {
  const { endDate } = getWeekDateRange(report.id)
  return endDate >= startOfDay(new Date())
}

function getPreviousWeekReportId(weekId, projectStart) {
  const weekStart = parseDayId(weekId)
  const previousWeekStart = addDays(weekStart, -7)
  const projectStartDay = startOfDay(projectStart)

  if (previousWeekStart < projectStartDay) {
    return null
  }

  return weekIdFromStart(previousWeekStart)
}

function applyContentToNewReport(report, previousReport, projectId) {
  const inProgress = isReportInProgress(report)
  const useDemo = shouldSeedProgressReportDemo(projectId)

  if (inProgress) {
    if (previousReport) {
      return carryForwardProgressReportContent(report, previousReport)
    }

    if (useDemo) {
      const weekRange = report.weekRange ?? formatWeekRange(report.id)
      return {
        ...report,
        progressSummary: buildInitialDemoTargetPlan({ weekRange }),
        progressUpdate: {
          ...report.progressUpdate,
          content: "",
          updatedAt: new Date().toISOString(),
        },
      }
    }

    return report
  }

  if (useDemo && isTargetPlanEmpty(report)) {
    return fillDemoProgressReportContent(report)
  }

  return report
}
function mergeProgressReports(existingReports, generatedReports, projectId, projectStart) {
  const merged = new Map()

  for (const report of existingReports) {
    merged.set(report.id, report)
  }

  const sortedGenerated = [...generatedReports].sort((left, right) => left.id.localeCompare(right.id))

  for (const report of sortedGenerated) {
    if (merged.has(report.id)) {
      continue
    }

    const previousReportId = getPreviousWeekReportId(report.id, projectStart)
    const previousReport = previousReportId ? merged.get(previousReportId) : null
    merged.set(report.id, applyContentToNewReport(report, previousReport, projectId))
  }

  if (shouldSeedProgressReportDemo(projectId)) {
    for (const [reportId, report] of merged.entries()) {
      if (!isReportInProgress(report) && isTargetPlanEmpty(report)) {
        merged.set(reportId, fillDemoProgressReportContent(report))
      }
    }
  }

  for (const [reportId, report] of merged.entries()) {
    if (!isReportInProgress(report) || !isTargetPlanEmpty(report)) {
      continue
    }

    const previousReportId = getPreviousWeekReportId(reportId, projectStart)
    const previousReport = previousReportId ? merged.get(previousReportId) : null

    if (previousReport && !isTargetPlanEmpty(previousReport)) {
      merged.set(reportId, carryForwardProgressReportContent(report, previousReport))
      continue
    }

    if (shouldSeedProgressReportDemo(projectId)) {
      merged.set(reportId, fillDemoProgressReportContent(report))
    }
  }

  const today = startOfDay(new Date())

  return [...merged.values()]
    .map((report) => {
      const { endDate } = getWeekDateRange(report.id)
      const inProgress = endDate >= today

      if (inProgress) {
        return {
          ...report,
          status: "in-progress",
          completedAt: null,
        }
      }

      if (report.status === "in-progress") {
        return {
          ...report,
          status: "completed",
          completedAt: report.completedAt ?? formatShortDate(addDays(endDate, 1)),
        }
      }

      return report
    })
    .sort((left, right) => right.id.localeCompare(left.id))
}

/**
 * Get all progress reports for a project
 */
export function getProjectProgressReports(projectId) {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const registry = readProjectsRegistry()
    const projectFiles = registry.files[projectId]

    if (!projectFiles) {
      return []
    }

    return projectFiles.progressReports ?? []
  } catch {
    return []
  }
}

/**
 * Get a specific progress report
 */
export function getProjectProgressReport(projectId, reportId) {
  const reports = getProjectProgressReports(projectId)
  return reports.find((report) => report.id === reportId) ?? null
}

/**
 * Save or update a progress report
 */
export function saveProgressReport(projectId, report) {
  if (typeof window === "undefined") {
    return false
  }

  try {
    const registry = readProjectsRegistry()
    const projectFiles = registry.files[projectId]

    if (!projectFiles) {
      return false
    }

    const reports = projectFiles.progressReports || []
    const existingIndex = reports.findIndex((entry) => entry.id === report.id)

    if (existingIndex >= 0) {
      reports[existingIndex] = {
        ...reports[existingIndex],
        ...report,
        updatedAt: new Date().toISOString(),
      }
    } else {
      reports.push({ ...report, createdAt: new Date().toISOString() })
    }

    projectFiles.progressReports = reports
    registry.files[projectId] = projectFiles
    writeProjectsRegistry(registry)

    return true
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    return false
  }
}

/**
 * Ensure progress reports exist for every project week through today.
 * Called on app load and when opening progress reports — same pattern as daily valuation files.
 */
export function ensureProgressReportsExist(projectId) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const registry = readProjectsRegistry()

    if (!registry.files[projectId]) {
      registry.files[projectId] = {
        daily: [],
        weekly: [],
        monthly: [],
        progressReports: [],
      }
    }

    const projectStart = getProjectStartDate(projectId)
    const throughDayId = getProjectEffectiveThroughDate(projectId)
    const through = new Date(throughDayId)
    const generated = generateProgressReports(projectStart, through)
    const existing = registry.files[projectId].progressReports || []

    registry.files[projectId].progressReports = mergeProgressReports(
      existing,
      generated,
      projectId,
      projectStart
    )
    writeProjectsRegistry(registry)
  } catch {
    // Silently fail
  }
}

/**
 * Delete a progress report
 */
export function deleteProgressReport(projectId, reportId) {
  if (typeof window === "undefined") {
    return false
  }

  try {
    const registry = readProjectsRegistry()
    const projectFiles = registry.files[projectId]

    if (!projectFiles) {
      return false
    }

    const reports = projectFiles.progressReports || []
    projectFiles.progressReports = reports.filter((report) => report.id !== reportId)
    registry.files[projectId] = projectFiles
    writeProjectsRegistry(registry)

    return true
  } catch {
    return false
  }
}

/**
 * Add an attachment to a progress report
 */
export function addAttachment(projectId, reportId, attachment) {
  const report = getProjectProgressReport(projectId, reportId)
  if (!report) return false

  const updated = {
    ...report,
    attachments: [...(report.attachments || []), attachment],
  }

  return saveProgressReport(projectId, updated)
}

/**
 * Remove an attachment from a progress report
 */
export function removeAttachment(projectId, reportId, attachmentId) {
  const report = getProjectProgressReport(projectId, reportId)
  if (!report) return false

  const updated = {
    ...report,
    attachments: report.attachments.filter((attachment) => attachment.id !== attachmentId),
  }

  return saveProgressReport(projectId, updated)
}
