"use client"

import CumulativePeriodNote from "@/components/project/CumulativePeriodNote"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { getGoodsOverviewRows } from "@/lib/goodsOverview"
import {
  formatMaterialAmount,
  formatMaterialCurrencyAmount,
} from "@/lib/plantCostCalculations"
import { getCeoGoodsOverviewHref } from "@/lib/projectRoutes"

const TITLES = {
  ordered: "Ordered",
  received: "Received",
  pending: "Pending",
}

function Money({ value }) {
  return formatMaterialCurrencyAmount(value)
}

function Qty({ value }) {
  return formatMaterialAmount(value)
}

export default function CeoGoodsOverviewTable({ projectId, projectName, mode }) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjectData()
  void version
  const rows = (hasHydrated ? getGoodsOverviewRows(projectId) : []).filter((row) => {
    if (mode === "ordered") return row.hasOrdered
    if (mode === "received") return row.hasReceived
    return row.hasOrdered || row.hasReceived
  })

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getCeoGoodsOverviewHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Goods overview
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{TITLES[mode]}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {projectName || "Project"}
        </h1>
        <CumulativePeriodNote projectId={projectId} />
      </header>

      {!hasHydrated ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No goods have been entered on the daily dashboards yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {mode === "ordered" ? (
                <tr>
                  <th className="px-4 py-3">Good</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Cumulative quantity ordered</th>
                  <th className="px-4 py-3 text-right">Cumulative cost</th>
                </tr>
              ) : null}
              {mode === "received" ? (
                <tr>
                  <th className="px-4 py-3">Good</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Cumulative quantity received</th>
                  <th className="px-4 py-3 text-right">Cumulative cost</th>
                </tr>
              ) : null}
              {mode === "pending" ? (
                <tr>
                  <th className="px-4 py-3">Good</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Quantity ordered</th>
                  <th className="px-4 py-3 text-right">Quantity received</th>
                  <th className="px-4 py-3 text-right">Quantity variance</th>
                  <th className="px-4 py-3 text-right">Cost ordered</th>
                  <th className="px-4 py-3 text-right">Cost received</th>
                  <th className="px-4 py-3 text-right">Cost variance</th>
                </tr>
              ) : null}
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={row.description}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.description}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.unit || "—"}</td>
                  {mode === "ordered" ? (
                    <>
                      <td className="px-4 py-3 text-right">{Qty({ value: row.orderedQuantity })}</td>
                      <td className="px-4 py-3 text-right">{Money({ value: row.orderedCost })}</td>
                    </>
                  ) : null}
                  {mode === "received" ? (
                    <>
                      <td className="px-4 py-3 text-right">{Qty({ value: row.receivedQuantity })}</td>
                      <td className="px-4 py-3 text-right">{Money({ value: row.receivedCost })}</td>
                    </>
                  ) : null}
                  {mode === "pending" ? (
                    <>
                      <td className="px-4 py-3 text-right">{Qty({ value: row.orderedQuantity })}</td>
                      <td className="px-4 py-3 text-right">{Qty({ value: row.receivedQuantity })}</td>
                      <td className="px-4 py-3 text-right">{Qty({ value: row.quantityVariance })}</td>
                      <td className="px-4 py-3 text-right">{Money({ value: row.orderedCost })}</td>
                      <td className="px-4 py-3 text-right">{Money({ value: row.receivedCost })}</td>
                      <td className="px-4 py-3 text-right">{Money({ value: row.costVariance })}</td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
