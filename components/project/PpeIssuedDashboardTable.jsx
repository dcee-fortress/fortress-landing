"use client"

import {
  formatMaterialAmount,
  formatMaterialCurrencyAmount,
} from "@/lib/plantCostCalculations"

export const PPE_ISSUED_DASHBOARD_COLUMNS = [
  { key: "description", label: "PPE issued", align: "left" },
  { key: "quantity", label: "Quantities", align: "right" },
  { key: "totalCost", label: "Total cost", align: "right" },
]

export default function PpeIssuedDashboardTable({ lines, emptyMessage }) {
  const rows = Array.isArray(lines) ? lines : []
  const totalCost = rows.reduce((sum, row) => sum + (Number(row.totalCost) || 0), 0)
  const totalQuantity = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-5">
        {emptyMessage || "No PPE issued entries yet."}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {PPE_ISSUED_DASHBOARD_COLUMNS.map((column) => (
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
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-100">
              <td className="px-3 py-2.5 text-zinc-800">{row.description}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-zinc-800">
                {formatMaterialAmount(row.quantity)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums font-medium text-zinc-900">
                {formatMaterialCurrencyAmount(row.totalCost)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-zinc-50 font-semibold text-zinc-900">
            <td className="px-3 py-3">Total</td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatMaterialAmount(totalQuantity)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatMaterialCurrencyAmount(totalCost)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
