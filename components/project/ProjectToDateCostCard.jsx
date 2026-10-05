"use client"

import ExportPdfButton from "@/components/project/ExportPdfButton"
import { formatCurrency } from "@/lib/formatCurrency"

export const PROJECT_TO_DATE_COST_LABEL = "Project to date cost incurred"

export default function ProjectToDateCostCard({ summary, onExportPdf }) {
  const costToDate = summary.totals?.valueEarned ?? 0

  return (
    <div>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {PROJECT_TO_DATE_COST_LABEL}
        </p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">
          {formatCurrency(costToDate)}
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Cumulative cost — sum of all costs for the project from the daily valuations.
        </p>
      </div>

      {onExportPdf ? (
        <div className="no-print mt-3">
          <ExportPdfButton onClick={onExportPdf} />
        </div>
      ) : null}
    </div>
  )
}
