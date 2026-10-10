import { getProjectStartDate } from "@/lib/periodFiles"

const DATE_FORMAT = { day: "numeric", month: "long", year: "numeric" }

function formatLongDate(date) {
  return date.toLocaleDateString("en-GB", DATE_FORMAT)
}

/** Project start through today. Today is read when the page opens, so it moves forward each day. */
export function formatCumulativePeriod(projectId, today = new Date()) {
  const startLabel = formatLongDate(getProjectStartDate(projectId))
  const todayLabel = formatLongDate(today)
  return `Cumulative from ${startLabel} to ${todayLabel}`
}
