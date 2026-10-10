import { getGoodsAcquiredDashboardLinesForDayIds, getGoodsAcquiredDayIds } from "@/lib/goodsAcquired"
import { getGoodsReceivedDashboardLinesForDayIds, getGoodsReceivedDayIds } from "@/lib/goodsReceived"
import { roundMaterialAmount } from "@/lib/plantCostCalculations"

function lineKey(description) {
  return String(description || "").trim().toLowerCase()
}

function namedDescription(description) {
  const text = String(description || "").trim()
  if (!text || text === "—") return ""
  return text
}

function emptyLine(description) {
  return {
    description: String(description || "").trim() || "—",
    unit: "",
    quantity: 0,
    totalCost: 0,
  }
}

/**
 * One row per good name, with project-to-date ordered and received quantity and cost.
 * Variance is ordered minus received.
 */
export function getGoodsOverviewRows(projectId) {
  const ordered = getGoodsAcquiredDashboardLinesForDayIds(
    projectId,
    getGoodsAcquiredDayIds(projectId)
  )
  const received = getGoodsReceivedDashboardLinesForDayIds(
    projectId,
    getGoodsReceivedDayIds(projectId)
  )
  const byName = new Map()

  const ensure = (description) => {
    const key = lineKey(description)
    if (!byName.has(key)) byName.set(key, { ...emptyLine(description), ordered: emptyLine(description), received: emptyLine(description) })
    return byName.get(key)
  }

  for (const line of ordered) {
    const description = namedDescription(line.description)
    if (!description) continue
    const row = ensure(description)
    row.description = description
    row.hasOrdered = true
    row.unit = row.unit || line.unit || ""
    row.ordered = {
      description,
      unit: line.unit || "",
      quantity: Number(line.quantity) || 0,
      totalCost: Number(line.totalCost) || 0,
    }
  }

  for (const line of received) {
    const description = namedDescription(line.description)
    if (!description) continue
    const row = ensure(description)
    if (!namedDescription(row.description)) row.description = description
    row.hasReceived = true
    row.unit = row.unit || line.unit || ""
    row.received = {
      description,
      unit: line.unit || "",
      quantity: Number(line.quantity) || 0,
      totalCost: Number(line.totalCost) || 0,
    }
  }

  return [...byName.values()]
    .map((row) => ({
      description: row.description,
      unit: row.unit || row.ordered.unit || row.received.unit || "",
      hasOrdered: Boolean(row.hasOrdered),
      hasReceived: Boolean(row.hasReceived),
      orderedQuantity: row.ordered.quantity,
      orderedCost: row.ordered.totalCost,
      receivedQuantity: row.received.quantity,
      receivedCost: row.received.totalCost,
      quantityVariance:
        roundMaterialAmount(row.ordered.quantity - row.received.quantity) ?? 0,
      costVariance: roundMaterialAmount(row.ordered.totalCost - row.received.totalCost) ?? 0,
    }))
    .sort((left, right) => left.description.localeCompare(right.description))
}
