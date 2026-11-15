"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { resolveActualCostAnalysisRow } from "@/lib/actualCostAnalysis"
import { MATERIAL_SCHEDULE_COLUMNS } from "@/lib/materialSchedule"
import { formatMaterialCurrencyAmount, formatMaterialRate } from "@/lib/plantCostCalculations"
import { getQsOverviewHref } from "@/lib/qsOverview"
import {
  decideValuationVariation,
  getValuationVariation,
} from "@/lib/valuationVariations"

const REVIEW_COLUMNS = MATERIAL_SCHEDULE_COLUMNS.filter(
  (column) => column.key !== "details" && column.key !== "allowableRate"
)

export default function ValuationVariationReviewView({ projectId, projectName, variationId }) {
  const { version } = useProjectData()
  const [message, setMessage] = useState("")

  const variation = useMemo(() => {
    void version
    return getValuationVariation(projectId, variationId)
  }, [projectId, variationId, version])

  const resolvedRows = useMemo(
    () => (variation?.rows || []).map(resolveActualCostAnalysisRow),
    [variation]
  )

  const decide = async (status) => {
    try {
      const updated = await decideValuationVariation(projectId, variationId, status)
      setMessage(
        updated
          ? status === "approved"
            ? "Variation approved. This day’s actual rate/cost now use the variation table. Later days still use Actual cost analysis."
            : "Variation disapproved."
          : "Could not update variation."
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update variation.")
    }
  }

  if (!variation) {
    return (
      <div className="space-y-4">
        <Link
          href={getQsOverviewHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Head QS Overview
        </Link>
        <p className="text-zinc-600">Variation not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getQsOverviewHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Head QS Overview
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Variation review</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {projectName}
        </h1>
        <p className="text-sm text-zinc-500">
          Day {variation.dayId} · Status: {variation.status}
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto px-4 py-4 sm:px-6">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-white">
                {REVIEW_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 font-semibold ${column.align === "left" ? "text-left" : "text-right"}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resolvedRows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-200">
                  {REVIEW_COLUMNS.map((column) => {
                    let value = row[column.key]
                    if (column.key === "fuelCost" || column.key === "totalCost") {
                      value =
                        row[column.key] == null ? "—" : formatMaterialCurrencyAmount(row[column.key])
                    } else if (column.key === "rate") {
                      value = formatMaterialRate(row.rate)
                    } else {
                      value = value || "—"
                    }
                    return (
                      <td
                        key={column.key}
                        className={`px-3 py-3 ${column.align === "right" ? "text-right tabular-nums" : ""}`}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          <p className="text-sm text-zinc-600">{message || "Approve to use this table for the submitted day only."}</p>
          {variation.status === "pending" ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => decide("rejected")}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Disapprove
              </button>
              <button
                type="button"
                onClick={() => decide("approved")}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                Approve
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
