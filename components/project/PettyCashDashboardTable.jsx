"use client"

import { formatMaterialCurrencyAmount } from "@/lib/plantCostCalculations"

export const PETTY_CASH_DASHBOARD_COLUMNS = [
  { key: "description", label: "Description of transaction", align: "left" },
  { key: "cashReceived", label: "Cash received", align: "right" },
  { key: "amountPaid", label: "Amount paid", align: "right" },
  { key: "cashBalance", label: "Cash balance", align: "right" },
]

export default function PettyCashDashboardTable({ lines, emptyMessage }) {
  const rows = Array.isArray(lines) ? lines : []
  const totalReceived = rows.reduce((sum, row) => sum + (Number(row.cashReceived) || 0), 0)
  const totalPaid = rows.reduce((sum, row) => sum + (Number(row.amountPaid) || 0), 0)
  const totalBalance = rows.reduce((sum, row) => sum + (Number(row.cashBalance) || 0), 0)

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-5">
        {emptyMessage || "No petty cash entries yet."}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {PETTY_CASH_DASHBOARD_COLUMNS.map((column) => (
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
                {formatMaterialCurrencyAmount(row.cashReceived)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-zinc-800">
                {formatMaterialCurrencyAmount(row.amountPaid)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums font-medium text-zinc-900">
                {formatMaterialCurrencyAmount(row.cashBalance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-zinc-50 font-semibold text-zinc-900">
            <td className="px-3 py-3">Total</td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatMaterialCurrencyAmount(totalReceived)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatMaterialCurrencyAmount(totalPaid)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatMaterialCurrencyAmount(totalBalance)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
