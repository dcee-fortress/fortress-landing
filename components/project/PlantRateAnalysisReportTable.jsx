"use client"

import { formatDailyRate, formatPlantCost } from "@/lib/plantCostData"

export default function PlantRateAnalysisReportTable({
  summary,
  emptyMessage,
  totalLabel = "Daily total",
}) {
  const { rows, totals, currentDate } = summary

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50">
            <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
              Current date
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
              Plant name
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
              Activity on site
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
              Daily plant cost
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
              Production
            </th>
            <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
              Daily rate
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            <>
              {rows.map((row) => (
                <tr key={row.id ?? row.plantName} className="bg-white">
                  <td className="border border-zinc-200 px-3 py-2 text-zinc-900">
                    {row.currentDate || currentDate}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-zinc-900">
                    {row.plantName}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-zinc-700">
                    {row.activityOnSite || "—"}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right font-medium tabular-nums text-zinc-900">
                    {formatPlantCost(row.dailyPlantCost)}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-zinc-900">
                    {row.production || "—"}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right font-semibold tabular-nums text-zinc-900">
                    {formatDailyRate(row.dailyRate)}
                  </td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold">
                <td className="border border-zinc-200 px-3 py-2 text-zinc-900" colSpan={3}>
                  {totalLabel}
                </td>
                <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-zinc-900">
                  {formatPlantCost(totals.dailyPlantCost)}
                </td>
                <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-zinc-900">
                  {totals.production || "—"}
                </td>
                <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-zinc-900">
                  {formatDailyRate(totals.dailyRate)}
                </td>
              </tr>
            </>
          ) : (
            <tr>
              <td
                colSpan={6}
                className="border border-zinc-200 px-6 py-10 text-center text-zinc-500"
              >
                {emptyMessage ??
                  "No plant cost data yet. Add hourly dashboards below and enter plant cost and production in each slot's material schedule."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
