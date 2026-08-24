export const DAILY_SLOT_TEMPLATES = [
  { id: "0700-0900", startTime: "07:00", endTime: "09:00", label: "Hourly dashboard", order: 1 },
  { id: "0900-1100", startTime: "09:00", endTime: "11:00", label: "Hourly dashboard", order: 2 },
  { id: "1100-1300", startTime: "11:00", endTime: "13:00", label: "Hourly dashboard", order: 3 },
  { id: "1300-1500", startTime: "13:00", endTime: "15:00", label: "Hourly dashboard", order: 4 },
  { id: "1500-1700", startTime: "15:00", endTime: "17:00", label: "Hourly dashboard", order: 5 },
]

function splitDailyTotal(total, parts) {
  const base = Math.floor(total / parts)
  const values = Array.from({ length: parts }, () => base)
  let remainder = total - base * parts

  for (let index = 0; remainder > 0; index += 1) {
    values[index % parts] += 1
    remainder -= 1
  }

  return values
}

export function buildDefaultSlotsForDay(dailyFile) {
  const slotCount = DAILY_SLOT_TEMPLATES.length
  const earned = splitDailyTotal(dailyFile.valueEarned ?? 0, slotCount)
  const production = splitDailyTotal(dailyFile.production ?? 0, slotCount)

  return DAILY_SLOT_TEMPLATES.map((template, index) => ({
    id: template.id,
    label: template.label,
    order: template.order,
    valueEarned: earned[index],
    production: production[index],
  }))
}

export function sortSlots(slots) {
  return [...slots].sort((left, right) => left.order - right.order)
}

export function aggregateSlotsToDailyTotals(slots) {
  return slots.reduce(
    (totals, slot) => ({
      valueEarned: totals.valueEarned + (slot.valueEarned ?? 0),
      production: totals.production + (slot.production ?? 0),
    }),
    { valueEarned: 0, production: 0 }
  )
}

export function getMissingSlotTemplates(activeSlots) {
  const activeIds = new Set(activeSlots.map((slot) => slot.id))

  return DAILY_SLOT_TEMPLATES.filter((template) => !activeIds.has(template.id))
}

export function getDailySlotsStorageKey(dayId) {
  return `daily-slots-${dayId}`
}
