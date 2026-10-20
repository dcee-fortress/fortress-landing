"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import DashboardSearch, { useDashboardSearch } from "@/components/project/DashboardSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { getGoodsOverviewRows } from "@/lib/goodsOverview"
import {
  formatMaterialAmount,
  formatMaterialUnitPriceAmount,
} from "@/lib/plantCostCalculations"
import { getMaterialSchedulesHref } from "@/lib/projectRoutes"

const ROW_ID_PREFIX = "material-analysis-row"

function withUnit(amount, unit) {
  const text = formatMaterialAmount(amount)
  return unit ? `${text} ${unit}` : text
}

function sameQuantity(word, value) {
  const query = Number(word)
  const amount = Number(value)
  return Number.isFinite(query) && Number.isFinite(amount) && Math.abs(query - amount) < 0.001
}

function analysisRowMatches(row, words) {
  const description = String(row.description || "").toLowerCase()
  const tokens = description.split(/[^a-z0-9.]+/).filter(Boolean)
  const quantities = [row.orderedQuantity, row.receivedQuantity, row.quantityVariance]

  return words.every((word) => {
    const numeric = word.replace(/,/g, "")
    if (/^-?\d+(\.\d+)?$/.test(numeric)) {
      return quantities.some((value) => sameQuantity(numeric, value)) || tokens.includes(numeric)
    }
    return description.includes(word) || String(row.unit || "").toLowerCase().includes(word)
  })
}

function getAnalysisDetails(row) {
  return [
    { label: "Fuel requested", value: withUnit(row.orderedQuantity, row.unit) },
    { label: "Cost of fuel requested", value: formatMaterialUnitPriceAmount(row.orderedCost) },
    { label: "Fuel received", value: withUnit(row.receivedQuantity, row.unit) },
    { label: "Cost of fuel received", value: formatMaterialUnitPriceAmount(row.receivedCost) },
    { label: "Total fuel left", value: withUnit(row.quantityVariance, row.unit) },
    { label: "Total cost of fuel left", value: formatMaterialUnitPriceAmount(row.costVariance) },
  ]
}

export default function GoodsAnalysisView({ projectId, projectName }) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjectData()
  void version
  const rows = (hasHydrated ? getGoodsOverviewRows(projectId) : []).filter(
    (row) => row.hasOrdered || row.hasReceived
  )
  const search = useDashboardSearch({
    rows,
    matchesRow: analysisRowMatches,
    rowIdPrefix: ROW_ID_PREFIX,
    panelId: "material-analysis-search",
  })

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialSchedulesHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Fuel schedule
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Fuel analysis</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Figures are cumulative from the project start through today. Similar descriptions are
          written as one line and their quantities are added together. Fuel left is cumulative
          fuel requested minus cumulative fuel received. The cost is calculated the same way.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Fuel variance
          </h2>
        </div>

        {!hasHydrated ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">Loading fuel analysis…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">
            No named fuel has been entered on the fuel requested or fuel received dashboards yet.
          </p>
        ) : (
          <div className="px-4 pb-4 pt-4 sm:px-6">
            <DashboardSearch
              search={search}
              rows={rows}
              placeholder="Search a description or quantity…"
              ariaLabel="Search fuel analysis by description or quantity"
              noMatchLabel="No fuel matches"
              getDetails={getAnalysisDetails}
            />
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name of fuel</th>
                  <th className="px-4 py-3 text-right">Fuel requested</th>
                  <th className="px-4 py-3 text-right">Cost of fuel requested</th>
                  <th className="px-4 py-3 text-right">Fuel received</th>
                  <th className="px-4 py-3 text-right">Cost of fuel received</th>
                  <th className="px-4 py-3 text-right">Total fuel left</th>
                  <th className="px-4 py-3 text-right">Total cost of fuel left</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.description}
                    id={`${ROW_ID_PREFIX}-${index}`}
                    className={`border-b border-zinc-100 last:border-0 ${
                      index === search.highlightedIndex
                        ? "bg-amber-100 outline outline-2 outline-amber-400"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">{row.description}</td>
                    <td className="px-4 py-3 text-right text-zinc-800">
                      {formatMaterialAmount(row.orderedQuantity)}
                      {row.unit ? ` ${row.unit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-800">
                      {formatMaterialUnitPriceAmount(row.orderedCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-800">
                      {formatMaterialAmount(row.receivedQuantity)}
                      {row.unit ? ` ${row.unit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-800">
                      {formatMaterialUnitPriceAmount(row.receivedCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-800">
                      {formatMaterialAmount(row.quantityVariance)}
                      {row.unit ? ` ${row.unit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-800">
                      {formatMaterialUnitPriceAmount(row.costVariance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
