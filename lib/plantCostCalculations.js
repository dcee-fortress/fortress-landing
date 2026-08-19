export function parsePlantCostAmount(value) {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null

  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

export function calculateFuelCost(fuelAllocated, fuelPrice) {
  const allocated = parsePlantCostAmount(fuelAllocated)
  const price = parsePlantCostAmount(fuelPrice)

  if (allocated === null || price === null) {
    return null
  }

  return Math.round(allocated * price * 100) / 100
}

export function calculateDailyRate(dailyPlantCost, production) {
  const cost = parsePlantCostAmount(dailyPlantCost)
  const output = parsePlantCostAmount(production)

  if (cost === null || output === null || output === 0) {
    return null
  }

  return Math.round((cost / output) * 10000) / 10000
}

export function roundMaterialAmount(value) {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return Math.round(numeric * 100) / 100
}

export function formatMaterialAmount(value) {
  if (value === null || value === undefined) return "—"

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatMaterialCurrencyAmount(value) {
  if (value === null || value === undefined) return "—"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatMaterialRate(value) {
  if (value === null || value === undefined) return "—"
  return formatMaterialCurrencyAmount(value)
}

export function formatDailyRate(value) {
  if (value === null || value === undefined) return "—"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}
