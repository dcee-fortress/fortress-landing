"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import DashboardSearch, { useDashboardSearch } from "@/components/project/DashboardSearch"
import MaterialRegisterTable from "@/components/project/MaterialRegisterTable"
import TableExportButtons from "@/components/project/TableExportButtons"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { getFuelAnalysisRows } from "@/lib/goodsOverview"
import { formatMaterialAmount, formatMaterialUnitPriceAmount } from "@/lib/plantCostCalculations"
import { getGoodsAnalysisDetailsHref, getMaterialSchedulesHref } from "@/lib/projectRoutes"

const COLUMNS = [
  { key: "description", label: "Description", align: "left", kind: "text" },
  { key: "bulkQuantity", label: "Fuel consumed", align: "right", kind: "number" },
  { key: "consumedQuantity", label: "Current bulk fuel", align: "right", kind: "number" },
  { key: "fuelLeft", label: "Fuel left in tank", align: "right", kind: "number" },
]

const ROW_ID_PREFIX = "fuel-analysis-row"

function sameQuantity(word, value) {
  const query = Number(word)
  const amount = Number(value)
  return Number.isFinite(query) && Number.isFinite(amount) && Math.abs(query - amount) < 0.001
}

function analysisRowMatches(row, words) {
  const description = String(row.description || "").toLowerCase()
  const quantities = [row.bulkQuantity, row.consumedQuantity, row.fuelLeft]
  return words.every((word) => {
    const numeric = word.replace(/,/g, "")
    if (/^-?\d+(\.\d+)?$/.test(numeric)) {
      return quantities.some((value) => sameQuantity(numeric, value)) || description.includes(numeric)
    }
    return description.includes(word)
  })
}

function getAnalysisDetails(row) {
  return [
    { label: "Fuel consumed", value: formatMaterialAmount(row.bulkQuantity) },
    { label: "Fuel consumed cost", value: formatMaterialUnitPriceAmount(row.bulkCost) },
    { label: "Current bulk fuel", value: formatMaterialAmount(row.consumedQuantity) },
    { label: "Current bulk fuel cost", value: formatMaterialUnitPriceAmount(row.consumedCost) },
    { label: "Fuel left in tank", value: formatMaterialAmount(row.fuelLeft) },
    { label: "Fuel left in tank cost", value: formatMaterialUnitPriceAmount(row.leftCost) },
  ]
}

export default function GoodsAnalysisView({ projectId, projectName }) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjectData()
  void version
  const lines = hasHydrated ? getFuelAnalysisRows(projectId) : []
  const search = useDashboardSearch({
    rows: lines,
    matchesRow: analysisRowMatches,
    rowIdPrefix: ROW_ID_PREFIX,
    panelId: "fuel-analysis-search",
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
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          Read-only project to date. Each fuel name is one line. Fuel left in tank is fuel consumed
          minus current bulk fuel.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Fuel left in tank</h2>
          {hasHydrated ? (
            <TableExportButtons
              columns={COLUMNS}
              rows={lines}
              title="Fuel analysis"
              projectName={projectName}
              filename="fuel-analysis"
              showTotal={false}
            />
          ) : null}
        </div>
        {!hasHydrated ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">Loading fuel analysis…</p>
        ) : lines.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">
            No petrol, diesel, oil, or blend has been entered yet.
          </p>
        ) : (
          <div className="px-4 pb-2 pt-4 sm:px-5">
            <DashboardSearch
              search={search}
              rows={lines}
              placeholder="Search a fuel name or quantity…"
              ariaLabel="Search fuel analysis by fuel name or quantity"
              noMatchLabel="No fuel matches"
              getDetails={getAnalysisDetails}
            />
            <MaterialRegisterTable
              columns={COLUMNS}
              lines={lines}
              showTotal={false}
              rowIdPrefix={ROW_ID_PREFIX}
              highlightedIndex={search.highlightedIndex}
            />
          </div>
        )}
        <div className="border-t border-zinc-200 px-4 py-4 sm:px-5">
          <Link
            href={getGoodsAnalysisDetailsHref(projectId)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Details
          </Link>
        </div>
      </section>
    </div>
  )
}
