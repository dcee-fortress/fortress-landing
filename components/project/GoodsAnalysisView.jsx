"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { getGoodsOverviewRows } from "@/lib/goodsOverview"
import {
  formatMaterialAmount,
  formatMaterialUnitPriceAmount,
} from "@/lib/plantCostCalculations"
import { getMaterialSchedulesHref } from "@/lib/projectRoutes"

export default function GoodsAnalysisView({ projectId, projectName }) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjectData()
  void version
  const rows = (hasHydrated ? getGoodsOverviewRows(projectId) : []).filter(
    (row) => row.hasOrdered || row.hasReceived
  )

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialSchedulesHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Material schedule
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Material analysis</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Figures are cumulative from the project start through today. Material left is cumulative
          material requested minus cumulative material received. The cost is calculated the same way.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Material variance
          </h2>
        </div>

        {!hasHydrated ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">Loading material analysis…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">
            No named material has been entered on the material requested or material received dashboards yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-white text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name of material</th>
                  <th className="px-4 py-3 text-right">Material requested</th>
                  <th className="px-4 py-3 text-right">Cost of material requested</th>
                  <th className="px-4 py-3 text-right">Material received</th>
                  <th className="px-4 py-3 text-right">Cost of material received</th>
                  <th className="px-4 py-3 text-right">Total material left</th>
                  <th className="px-4 py-3 text-right">Total cost of material left</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.description} className="border-b border-zinc-100 last:border-0">
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
        )}
      </section>
    </div>
  )
}
