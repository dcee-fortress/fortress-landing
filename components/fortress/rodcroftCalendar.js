const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (value) => String(value).padStart(2, '0')

const startOfDay = (date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const parseDayId = (dayId) => {
  const [year, month, day] = String(dayId || '').split('-').map(Number)
  if (!year || !month || !day) return null
  return startOfDay(new Date(year, month - 1, day))
}

const dayIdFromDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const formatShortDate = (date) =>
  `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`

const formatDayLabel = (date) =>
  `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`

const emptyFiles = () => ({ daily: [], weekly: [], monthly: [], deletedDailyIds: [] })

const buildCalendar = (startDate, today = new Date()) => {
  const start = parseDayId(startDate)
  if (!start) return null
  const through = startOfDay(today)
  if (start > through) return null
  const todayId = dayIdFromDate(through)

  const daily = []
  let cursor = start
  while (cursor <= through) {
    const id = dayIdFromDate(cursor)
    daily.push({
      id,
      label: formatDayLabel(cursor),
      date: formatShortDate(cursor),
      completedAt: 'Awaiting entry',
      awaitingEntry: true,
      isToday: id === todayId,
      valueEarned: 0,
      production: 0,
    })
    cursor = addDays(cursor, 1)
  }
  daily.reverse()

  const weekly = []
  let weekStart = start
  let weekNumber = 1
  while (weekStart <= through) {
    const weekEnd = addDays(weekStart, 6)
    const inProgress = weekEnd >= through
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear()
    const range = sameMonth
      ? `${weekStart.getDate()}–${weekEnd.getDate()} ${SHORT_MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
      : `${weekStart.getDate()} ${SHORT_MONTHS[weekStart.getMonth()]} – ${weekEnd.getDate()} ${SHORT_MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
    weekly.push({
      id: dayIdFromDate(weekStart),
      label: `Week ${weekNumber} · ${range}`,
      completedAt: inProgress ? 'In progress' : formatShortDate(addDays(weekEnd, 1)),
      inProgress,
      valueEarned: 0,
      production: 0,
    })
    if (inProgress) break
    weekStart = addDays(weekStart, 7)
    weekNumber += 1
  }
  weekly.reverse()

  const monthly = []
  let monthCursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (monthCursor <= through) {
    const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
    const inProgress = startOfDay(monthEnd) > through
    const completedDate = addDays(monthEnd, 1)
    monthly.push({
      id: `${monthCursor.getFullYear()}-${pad(monthCursor.getMonth() + 1)}`,
      label: `${MONTHS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`,
      completedAt: inProgress
        ? 'In progress'
        : `${completedDate.getDate()} ${SHORT_MONTHS[completedDate.getMonth()]} ${completedDate.getFullYear()}`,
      inProgress,
      valueEarned: 0,
      production: 0,
    })
    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
  }
  monthly.reverse()

  return { daily, weekly, monthly, deletedDailyIds: [] }
}

const idsOf = (files = []) => files.map((file) => file.id).join('|')

const sameCalendar = (existing, next) => {
  if (!existing) return false
  const todayFlag = (files) => files.find((file) => file.isToday)?.id || ''
  return (
    idsOf(existing.daily) === idsOf(next.daily) &&
    idsOf(existing.weekly) === idsOf(next.weekly) &&
    idsOf(existing.monthly) === idsOf(next.monthly) &&
    todayFlag(existing.daily) === todayFlag(next.daily)
  )
}

const mergeList = (previous = [], incoming = []) => {
  const saved = new Map(previous.filter((file) => file?.id).map((file) => [file.id, file]))
  return incoming.map((file) => {
    const prior = saved.get(file.id)
    if (!prior) return file
    return {
      ...file,
      ...prior,
      label: file.label,
      isToday: Boolean(file.isToday),
      inProgress: file.inProgress,
      completedAt: prior.completedAt && prior.completedAt !== 'Awaiting entry' ? prior.completedAt : file.completedAt,
    }
  })
}

export const ensureProjectFiles = (existing, startDate) => {
  const built = buildCalendar(startDate)
  if (!built) return existing || emptyFiles()
  const deleted = new Set((existing?.deletedDailyIds || []).filter(Boolean))
  const next = {
    daily: built.daily.filter((file) => !deleted.has(file.id)),
    weekly: built.weekly,
    monthly: built.monthly,
    deletedDailyIds: [...deleted],
  }
  if (sameCalendar(existing, next)) return existing
  return {
    daily: mergeList(existing?.daily, next.daily),
    weekly: mergeList(existing?.weekly, next.weekly),
    monthly: mergeList(existing?.monthly, next.monthly),
    deletedDailyIds: next.deletedDailyIds,
  }
}

const entryDate = (entry) => {
  const date = String(entry?.date || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const fileId = String(entry?.fileId || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(fileId)) return fileId
  return ''
}

const shiftDayId = (dayId, days) => {
  const parsed = parseDayId(dayId)
  if (!parsed) return ''
  return dayIdFromDate(addDays(parsed, days))
}

export const isDailyEntryFile = (file) =>
  Boolean(file?.id && /^\d{4}-\d{2}-\d{2}$/.test(file.id) && !String(file.label || '').startsWith('Week '))

export const entryBelongsToFile = (entry, file) => {
  if (!file?.id) return true
  const date = entryDate(entry)
  if (/^\d{4}-\d{2}$/.test(file.id)) return date.startsWith(file.id)
  if (String(file.label || '').startsWith('Week ')) {
    const end = shiftDayId(file.id, 7)
    return Boolean(date && end && date >= file.id && date < end)
  }
  if (isDailyEntryFile(file)) return date === file.id || entry?.fileId === file.id
  return true
}

export const PERIOD_CHOICES = [
  {
    id: 'project-to-date',
    label: 'Project to date',
    description: 'Cumulative cost, production, and rate from the project start',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    description: 'Monthly files from the day the project started',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    description: 'Weekly files in 7-day periods from the project start',
  },
  {
    id: 'daily',
    label: 'Daily',
    description: 'A daily file for every day from the project start through today',
  },
]
