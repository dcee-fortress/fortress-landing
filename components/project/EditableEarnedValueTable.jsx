"use client"

import ExportPdfButton from "@/components/project/ExportPdfButton"
import {
  EARNED_VALUE_TABLE_HEADERS,
  formatEarnedValueProduction,
  formatEarnedValueRate,
  resolveEarnedValueRowRate,
  resolveEarnedValueTotalRate,
} from "@/lib/earnedValueTable"
import { formatCurrency } from "@/lib/formatCurrency"

function parseNumber(value) {
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function EditableCell({ value, onChange, align = "right" }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
        align === "right" ? "text-right tabular-nums" : "text-left"
      }`}
    />
  )
}

export default function EditableEarnedValueTable({ summary, onRowChange, footnote, onExportPdf }) {
  const totalRate = resolveEarnedValueTotalRate(summary.totals)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-left text-white">
              {EARNED_VALUE_TABLE_HEADERS.map((header) => (
                <th
                  key={header}
                  className={`px-4 py-3 font-semibold ${
                    header === "Description" ? "text-left" : "text-right"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row, rowIndex) => (
              <tr key={row.id ?? `${row.description}-${rowIndex}`} className="border-b border-zinc-200">
                <td className="px-4 py-3">
                  <EditableCell
                    value={row.description}
                    align="left"
                    onChange={(value) => onRowChange(rowIndex, "description", value)}
                  />
                </td>
                <td className="px-4 py-3">
                  <EditableCell
                    value={row.valueEarned}
                    onChange={(value) => onRowChange(rowIndex, "valueEarned", parseNumber(value))}
                  />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                  {formatEarnedValueProduction(row.production)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                  {formatEarnedValueRate(resolveEarnedValueRowRate(row))}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-900 bg-zinc-50 font-semibold">
              <td className="px-4 py-4 text-zinc-900">Total</td>
              <td className="px-4 py-4 text-right tabular-nums text-zinc-900">
                {formatCurrency(summary.totals.valueEarned)}
              </td>
              <td className="px-4 py-4 text-right tabular-nums text-zinc-900">
                {formatEarnedValueProduction(summary.totals.production)}
              </td>
              <td className="px-4 py-4 text-right tabular-nums text-zinc-900">
                {formatEarnedValueRate(totalRate)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50">
              <td colSpan={EARNED_VALUE_TABLE_HEADERS.length} className="px-4 py-3 text-sm italic text-zinc-600">
                {footnote ??
                  "Rate = actual cost on site ÷ production for each row and the dashboard total."}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {onExportPdf ? (
        <div className="no-print mt-3 px-4">
          <ExportPdfButton onClick={onExportPdf} />
        </div>
      ) : null}
    </div>
  )
}

export { EARNED_VALUE_TABLE_HEADERS as EDITABLE_EARNED_VALUE_TABLE_HEADERS }
