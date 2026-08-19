"use client"

import { formatBoqRate } from "@/lib/boqData"
import { ACTUAL_RATE_COLUMN_LABEL } from "@/lib/rateAnalysis"

function varianceClass(value) {
  if (value === null || value === undefined) return "text-zinc-500"
  if (value > 0) return "text-red-600"
  if (value < 0) return "text-emerald-600"
  return "text-zinc-900"
}

function formatUnit(value) {
  const trimmed = String(value ?? "").trim()
  return trimmed || "—"
}

export default function RatesBoqReportTable({ rows, period, emptyMessage }) {
  void period

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500">
        {emptyMessage ??
          "No actual rates recorded for this period yet. Enter valuations on the daily dashboard to build this report."}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50">
            <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
              Activity description
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
              Unit
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
              {ACTUAL_RATE_COLUMN_LABEL}
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
              BOQ rate
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
              Variance
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.activityDescription}-${row.boqItemName}-${index}`}
              className="bg-white"
            >
              <td className="border border-zinc-200 px-3 py-2 text-zinc-900">
                <div>{row.activityDescription}</div>
                {row.boqItemName !== "—" ? (
                  <div className="mt-0.5 text-xs text-zinc-500">Matched BOQ: {row.boqItemName}</div>
                ) : null}
              </td>
              <td className="border border-zinc-200 px-3 py-2 text-zinc-700">
                {formatUnit(row.unit || row.boqUnit)}
              </td>
              <td className="border border-zinc-200 px-3 py-2 text-right font-medium tabular-nums text-zinc-900">
                {formatBoqRate(row.actualRate)}
              </td>
              <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-zinc-900">
                {formatBoqRate(row.boqRate)}
              </td>
              <td
                className={`border border-zinc-200 px-3 py-2 text-right font-semibold tabular-nums ${varianceClass(row.variance)}`}
              >
                {row.variance === null ? "—" : formatBoqRate(row.variance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs italic text-zinc-600">
        Activity descriptions come from the valuations dashboard and are matched to BOQ descriptions.
        Actual rate = dashboard cost ÷ dashboard production for each activity in the period.
        Variance = actual rate minus BOQ rate.
      </p>
    </div>
  )
}
