"use client"

import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import {
  formatMaterialAmount,
  formatMaterialUnitPriceAmount,
} from "@/lib/plantCostCalculations"

function displayCell(column, row) {
  const value = row?.[column.key]
  if (column.kind === "date") {
    return formatDayLabelFromId(value) || value || "—"
  }
  if (column.kind === "number") return formatMaterialAmount(value)
  if (column.kind === "money" || column.kind === "computed") {
    return formatMaterialUnitPriceAmount(value)
  }
  return value || "—"
}

export default function MaterialRegisterTable({
  columns,
  lines,
  emptyMessage,
  showTotal = true,
  rowIdPrefix = "",
  highlightedIndex = null,
}) {
  const rows = Array.isArray(lines) ? lines : []
  const showsTotal =
    showTotal &&
    columns.some((column) => {
      if (column.kind === "number" || column.kind === "computed") return column.total !== false
      return false
    })

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-5">
        {emptyMessage || "No entries yet."}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`border-b border-zinc-200 px-3 py-3 ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              id={rowIdPrefix ? `${rowIdPrefix}-${index}` : undefined}
              className={`border-b border-zinc-100 ${
                index === highlightedIndex ? "bg-amber-100 outline outline-2 outline-amber-400" : ""
              }`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-2.5 text-zinc-800 ${
                    column.align === "right" ? "text-right tabular-nums" : "text-left"
                  } ${column.kind === "computed" ? "font-medium text-zinc-900" : ""}`}
                >
                  {displayCell(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {showsTotal ? (
          <tfoot>
            <tr className="bg-zinc-50 font-semibold text-zinc-900">
              {columns.map((column) => {
                if (column.key === "description") {
                  return (
                    <td key={column.key} className="px-3 py-3">
                      Total
                    </td>
                  )
                }
                if (column.kind === "number" && column.total !== false) {
                  const total = rows.reduce((sum, row) => sum + (Number(row[column.key]) || 0), 0)
                  return (
                    <td key={column.key} className="px-3 py-3 text-right tabular-nums">
                      {formatMaterialAmount(total)}
                    </td>
                  )
                }
                if (column.kind === "computed") {
                  const total = rows.reduce((sum, row) => sum + (Number(row[column.key]) || 0), 0)
                  return (
                    <td key={column.key} className="px-3 py-3 text-right tabular-nums">
                      {formatMaterialUnitPriceAmount(total)}
                    </td>
                  )
                }
                return <td key={column.key} className="px-3 py-3" />
              })}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}
