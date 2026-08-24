import { parsePlantCostAmount } from "@/lib/plantCostCalculations"

export const SITE_ACTIVITIES = [
  { description: "Reduced Levels", weight: 450 / 1850 },
  { description: "Structural Steel Erection", weight: 620 / 1850 },
  { description: "Concrete Slab Pours", weight: 480 / 1850 },
  { description: "Precast Panel Lifts", weight: 300 / 1850 },
]

function splitTotal(total, weights) {
  const values = weights.map((weight) => Math.round(total * weight))
  const diff = total - values.reduce((sum, value) => sum + value, 0)
  values[0] += diff
  return values
}

export function buildBlankEarnedValueActivities() {
  return []
}

export function buildEarnedValueActivities({ valueEarned, production = 0 }) {
  const weights = SITE_ACTIVITIES.map((activity) => activity.weight)
  const earned = splitTotal(valueEarned ?? 0, weights)
  const output = splitTotal(production ?? 0, weights)

  return SITE_ACTIVITIES.map((activity, index) => ({
    id: activity.description.toLowerCase().replace(/\s+/g, "-"),
    description: activity.description,
    valueEarned: earned[index],
    production: output[index],
  }))
}

export function summarizeEarnedValueActivities(rows) {
  const totals = rows.reduce(
    (acc, row) => ({
      valueEarned: acc.valueEarned + (parsePlantCostAmount(row.valueEarned) ?? 0),
      production: acc.production + (parsePlantCostAmount(row.production) ?? 0),
    }),
    { valueEarned: 0, production: 0 }
  )

  const roundedProduction = Math.round(totals.production * 100) / 100

  return {
    rows: rows.map((row) => ({
      ...row,
      valueEarned: parsePlantCostAmount(row.valueEarned) ?? 0,
      production: parsePlantCostAmount(row.production) ?? 0,
    })),
    totals: {
      valueEarned: totals.valueEarned,
      production: roundedProduction,
    },
  }
}

export function getEarnedValueSummary(data) {
  const activities = buildEarnedValueActivities(data)
  return summarizeEarnedValueActivities(activities)
}
