"use client"

import ExportPdfButton from "@/components/project/ExportPdfButton"
import {
  ACTUAL_COST_ON_SITE_LABEL,
  PRODUCTION_LABEL,
  RATE_LABEL,
  formatEarnedValueProduction,
  formatEarnedValueRate,
  resolveEarnedValueTotalRate,
} from "@/lib/earnedValueTable"
import { formatCurrency } from "@/lib/formatCurrency"

const PROJECT_TO_DATE_HEADERS = [ACTUAL_COST_ON_SITE_LABEL, PRODUCTION_LABEL, RATE_LABEL]

export default function ProjectToDateTotalsTable({ summary, onExportPdf }) {
  const { totals } = summary
  const totalRate = resolveEarnedValueTotalRate(totals)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
              {PROJECT_TO_DATE_HEADERS.map((header) => (
                <th key={header} className="px-4 py-3 text-right font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-200 bg-zinc-50 font-semibold">
              <td className="px-4 py-5 text-right tabular-nums text-zinc-900">
                {formatCurrency(totals.valueEarned ?? 0)}
              </td>
              <td className="px-4 py-5 text-right tabular-nums text-zinc-900">
                {formatEarnedValueProduction(totals.production ?? 0)}
              </td>
              <td className="px-4 py-5 text-right tabular-nums text-zinc-900">
                {formatEarnedValueRate(totalRate)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50">
              <td colSpan={PROJECT_TO_DATE_HEADERS.length} className="px-4 py-3 text-sm italic text-zinc-600">
                Grand total cumulative from all hourly dashboards saved to date — no activity
                breakdown. Rate = actual cost on site ÷ production.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {onExportPdf ? (
        <div className="no-print mt-3">
          <ExportPdfButton onClick={onExportPdf} />
        </div>
      ) : null}
    </div>
  )
}

export { PROJECT_TO_DATE_HEADERS }
