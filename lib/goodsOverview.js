import { getGoodsAcquiredDashboardLinesForDayIds, getGoodsAcquiredDayIds } from "@/lib/goodsAcquired"
import { getGoodsReceivedDashboardLinesForDayIds, getGoodsReceivedDayIds } from "@/lib/goodsReceived"
import { roundMaterialAmount, roundMaterialUnitPrice } from "@/lib/plantCostCalculations"
import { groupBySimilarDescription } from "@/lib/similarDescriptions"

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
  const tagged = []
  for (const line of ordered) {
    const description = namedDescription(line.description)
    if (!description) continue
    tagged.push({ ...line, description, side: "ordered" })
  }
  for (const line of received) {
    const description = namedDescription(line.description)
    if (!description) continue
    tagged.push({ ...line, description, side: "received" })
  }

  const byName = groupBySimilarDescription(tagged, (line) => line.description).map((group) => {
    const row = {
      ...emptyLine(group.description),
      ordered: emptyLine(group.description),
      received: emptyLine(group.description),
    }
    for (const line of group.items) {
      if (line.side === "ordered") {
        row.hasOrdered = true
        row.unit = row.unit || line.unit || ""
        row.ordered = {
          description: group.description,
          unit: line.unit || row.ordered.unit || "",
          quantity: roundMaterialAmount(row.ordered.quantity + (Number(line.quantity) || 0)) ?? row.ordered.quantity,
          totalCost:
            roundMaterialUnitPrice(row.ordered.totalCost + (Number(line.totalCost) || 0)) ?? row.ordered.totalCost,
        }
      } else {
        row.hasReceived = true
        row.unit = row.unit || line.unit || ""
        row.received = {
          description: group.description,
          unit: line.unit || row.received.unit || "",
          quantity:
            roundMaterialAmount(row.received.quantity + (Number(line.quantity) || 0)) ?? row.received.quantity,
          totalCost:
            roundMaterialUnitPrice(row.received.totalCost + (Number(line.totalCost) || 0)) ??
            row.received.totalCost,
        }
      }
    }
    return row
  })

  return byName
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
      costVariance: roundMaterialUnitPrice(row.ordered.totalCost - row.received.totalCost) ?? 0,
    }))
    .sort((left, right) => left.description.localeCompare(right.description))
}
