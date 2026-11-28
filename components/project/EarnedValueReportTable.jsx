"use client"

import ExportPdfButton from "@/components/project/ExportPdfButton"
import {
  EARNED_VALUE_TABLE_HEADERS,
  formatEarnedValueDate,
  formatEarnedValueProduction,
} from "@/lib/earnedValueTable"

export default function EarnedValueReportTable({
  summary,
  footnote,
  onExportPdf,
  rowIdPrefix,
  highlightedRowIndex = null,
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
              {EARNED_VALUE_TABLE_HEADERS.map((header) => (
                <th
                  key={header}
                  className={`px-4 py-3 font-semibold ${
                    header === "Production" ? "text-right" : "text-left"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row, index) => (
              <tr
                key={row.id ?? `${row.date}-${row.description}-${index}`}
                id={rowIdPrefix ? `${rowIdPrefix}-${index}` : undefined}
                className={`border-b border-zinc-200 transition-colors ${
                  index === highlightedRowIndex ? "bg-amber-100 outline outline-2 outline-amber-400" : ""
                }`}
              >
                <td className="px-4 py-4 whitespace-nowrap text-zinc-900">
                  {formatEarnedValueDate(row.date)}
                </td>
                <td className="px-4 py-4 font-medium text-zinc-900 break-words whitespace-normal">
                  {row.description}
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-zinc-900">
                  {formatEarnedValueProduction(row.production)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-900 bg-zinc-50 font-semibold">
              <td className="px-4 py-4 text-zinc-900" colSpan={2}>
                Total
              </td>
              <td className="px-4 py-4 text-right tabular-nums text-zinc-900">
                {formatEarnedValueProduction(summary.totals.production)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50">
              <td colSpan={EARNED_VALUE_TABLE_HEADERS.length} className="px-4 py-3 text-sm italic text-zinc-600">
                {footnote ?? "Production is summed from valuations entry for each date and activity."}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {onExportPdf ? (
        <div className="no-print mt-3 px-4">
          <ExportPdfButton
            onClick={() => onExportPdf("download")}
            onShareWhatsApp={() => onExportPdf("whatsapp")}
          />
        </div>
      ) : null}
    </div>
  )
}

export { EARNED_VALUE_TABLE_HEADERS }
