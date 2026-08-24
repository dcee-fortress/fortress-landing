const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function pad(value) {
  return String(value).padStart(2, "0")
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function parseDayId(dayId) {
  const [year, month, day] = dayId.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatShortDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function formatWeekRange(start, end) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()

  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
  }

  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
}

function formatWeekLabel(weekNumber, start, end) {
  return `Week ${weekNumber} · ${formatWeekRange(start, end)}`
}

export function weekIdFromStart(start) {
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
}

export function getWeekBoundsForDay(dayDate, projectStart) {
  const start = startOfDay(projectStart)
  const day = startOfDay(dayDate)

  if (day < start) return null

  const diffDays = Math.floor((day - start) / (1000 * 60 * 60 * 24))
  const weekIndex = Math.floor(diffDays / 7)
  const weekStart = addDays(start, weekIndex * 7)
  const weekEnd = addDays(weekStart, 6)
  const weekNumber = weekIndex + 1

  return { weekStart, weekEnd, weekNumber }
}

export function isWeekEndBeforeToday(weekStart) {
  const weekEnd = addDays(weekStart, 6)
  return weekEnd < startOfDay(new Date())
}

export function createWeekFile({ weekStart, weekEnd, weekNumber, inProgress = false, values = null }) {
  const totals = values ?? { valueEarned: 0, production: 0 }

  return {
    id: weekIdFromStart(weekStart),
    label: formatWeekLabel(weekNumber, weekStart, weekEnd),
    weekNumber,
    completedAt: inProgress ? "In progress" : formatShortDate(addDays(weekEnd, 1)),
    inProgress,
    ...totals,
  }
}

function buildWeeklyValues(weekNumber) {
  const valueEarned = 34_200 + (weekNumber % 9) * 1_200
  const production = 820 + (weekNumber % 6) * 45

  return { valueEarned, production }
}

function generateWeeklyFileRange(projectStart, throughDay, withValues) {
  const files = []
  let weekNumber = 1
  let weekStart = startOfDay(projectStart)
  const end = startOfDay(throughDay)
  const today = startOfDay(new Date())

  while (weekStart <= end) {
    const weekEnd = addDays(weekStart, 6)
    const inProgress = weekEnd >= today

    files.push(
      createWeekFile({
        weekStart,
        weekEnd,
        weekNumber,
        inProgress,
        values: withValues ? buildWeeklyValues(weekNumber) : null,
      })
    )

    if (inProgress) {
      break
    }

    weekStart = addDays(weekStart, 7)
    weekNumber += 1
  }

  return files.reverse()
}

export function generateWeeklyFiles(projectStart, throughDay) {
  return generateWeeklyFileRange(projectStart, throughDay, true)
}

export function generateBlankWeeklyFiles(projectStart, throughDay) {
  return generateWeeklyFileRange(projectStart, throughDay, false)
}

export const getGroveWeeklyFiles = (() => {
  let cache = null
  return () => {
    if (!cache) {
      cache = generateWeeklyFiles(new Date(2025, 0, 1), new Date())
    }
    return cache
  }
})()
