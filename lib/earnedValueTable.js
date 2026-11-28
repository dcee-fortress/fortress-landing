import { calculateDailyRate } from "@/lib/plantCostCalculations"

export const ACTUAL_COST_ON_SITE_LABEL = "Actual Cost on Site"
export const ACTUAL_COST_LABEL = ACTUAL_COST_ON_SITE_LABEL
export const DATE_LABEL = "Date"
export const ACTIVITY_DESCRIPTION_LABEL = "Activity description"
export const PRODUCTION_LABEL = "Production"
export const RATE_LABEL = "Rate"

/** Valuations dashboards (daily / weekly / monthly / project to date). */
export const EARNED_VALUE_TABLE_HEADERS = [
  DATE_LABEL,
  ACTIVITY_DESCRIPTION_LABEL,
  PRODUCTION_LABEL,
]

export function calculateEarnedValueRate(cost, production) {
  return calculateDailyRate(cost, production)
}

export function resolveEarnedValueRowRate(row) {
  return calculateEarnedValueRate(row?.valueEarned, row?.production)
}

export function resolveEarnedValueTotalRate(totals) {
  return calculateEarnedValueRate(totals?.valueEarned, totals?.production)
}

export function formatEarnedValueProduction(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

export function formatEarnedValueRate(value) {
  if (value === null || value === undefined) return "—"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

export function formatEarnedValueDate(value) {
  const text = String(value ?? "").trim()
  return text || "—"
}
