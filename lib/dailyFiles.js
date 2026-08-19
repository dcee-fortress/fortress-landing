const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function pad(value) {
  return String(value).padStart(2, "0")
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function dayIdFromDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDayId(dayId) {
  const [year, month, day] = dayId.split("-").map(Number)
  return startOfDay(new Date(year, month - 1, day))
}

export function getTodayDate() {
  return startOfDay(new Date())
}

export function getTodayDayId() {
  return dayIdFromDate(getTodayDate())
}

export function isTodayDayId(dayId) {
  return dayId === getTodayDayId()
}

function formatShortDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function formatDayLabel(date) {
  return `${WEEKDAYS[date.getDay()]} · ${formatShortDate(date)}`
}

function buildDailyValues(dayNumber) {
  const valueEarned = 4_850 + (dayNumber % 7) * 175
  const production = 120 + (dayNumber % 5) * 8

  return { valueEarned, production }
}

export function createBlankDailyFile(date, { isToday = false } = {}) {
  const day = startOfDay(date)

  return {
    id: dayIdFromDate(day),
    label: formatDayLabel(day),
    date: formatShortDate(day),
    completedAt: isToday ? "Awaiting entry" : formatShortDate(addDays(day, 1)),
    awaitingEntry: isToday,
    isToday,
    valueEarned: 0,
    production: 0,
  }
}

export function generateDailyFiles(projectStart, lastCompletedDay) {
  const files = []
  let dayNumber = 1
  let currentDay = startOfDay(projectStart)
  const end = startOfDay(lastCompletedDay)

  while (currentDay <= end) {
    const values = buildDailyValues(dayNumber)
    const isToday = dayIdFromDate(currentDay) === getTodayDayId()

    files.push({
      id: dayIdFromDate(currentDay),
      label: formatDayLabel(currentDay),
      date: formatShortDate(currentDay),
      completedAt: isToday ? "Awaiting entry" : formatShortDate(addDays(currentDay, 1)),
      awaitingEntry: isToday,
      isToday,
      ...values,
    })

    currentDay = addDays(currentDay, 1)
    dayNumber += 1
  }

  return files.reverse()
}

export const getGroveDailyFiles = (() => {
  let cache = null
  return () => {
    if (!cache) {
      cache = generateDailyFiles(new Date(2025, 0, 1), new Date())
    }
    return cache
  }
})()

export function generateBlankDailyFiles(projectStart, throughDay) {
  const files = []
  let currentDay = startOfDay(projectStart)
  const end = startOfDay(throughDay)

  while (currentDay <= end) {
    files.push(
      createBlankDailyFile(currentDay, {
        isToday: dayIdFromDate(currentDay) === getTodayDayId(),
      })
    )
    currentDay = addDays(currentDay, 1)
  }

  return files.reverse()
}

export function generateBlankDailyFilesFromDate(fromDate, throughDay) {
  const files = []
  let currentDay = startOfDay(fromDate)
  const end = startOfDay(throughDay)

  while (currentDay <= end) {
    files.push(
      createBlankDailyFile(currentDay, {
        isToday: dayIdFromDate(currentDay) === getTodayDayId(),
      })
    )
    currentDay = addDays(currentDay, 1)
  }

  return files.reverse()
}
