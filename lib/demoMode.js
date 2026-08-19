export const DEMO_VALUES_STORAGE_KEY = "grove-demo-values-enabled"

export function isDemoValuesEnabled() {
  return false
}

export function setDemoValuesEnabled() {}

export function enableDemoValues() {}

export function disableDemoValues() {}

export function resetDemoValuesPreference() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(DEMO_VALUES_STORAGE_KEY)
}

export function summaryHasValuationData(summary) {
  if (!summary) return false

  const { valueEarned = 0, production = 0 } = summary.totals ?? {}
  if (valueEarned > 0 || production > 0) {
    return true
  }

  return (summary.rows ?? []).some(
    (row) => (row.valueEarned ?? 0) > 0 || (row.production ?? 0) > 0
  )
}

export function shouldUseDemoValues(_projectId) {
  return false
}

export function getDaySummaryForDisplay(_projectId, _dayId, liveSummary) {
  return liveSummary
}

export function getWeekSummaryForDisplay(_projectId, _weekId, liveSummary) {
  return liveSummary
}

export function getMonthSummaryForDisplay(_projectId, _monthId, liveSummary) {
  return liveSummary
}

export function getProjectSummaryForDisplay(_projectId, liveSummary) {
  return liveSummary
}
