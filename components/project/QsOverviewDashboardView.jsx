"use client"

import { useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  formatQsOverviewCell,
  getQsOverviewHref,
  getQsOverviewPeriodHref,
  getQsOverviewRowsForPeriod,
  marginToneClass,
  QS_OVERVIEW_COLUMNS,
  summarizeQsOverviewRows,
} from "@/lib/qsOverview"

export default function QsOverviewDashboardView({
  projectId,
  projectName,
  period,
  fileId,
  periodLabel,
}) {
  const { version } = useProjectData()

  const rows = useMemo(() => {
    void version
    return getQsOverviewRowsForPeriod(projectId, period, fileId)
  }, [projectId, period, fileId, version])

  const totals = useMemo(() => summarizeQsOverviewRows(rows), [rows])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={
            period === "project-to-date"
              ? `${getQsOverviewHref(projectId)}/margin-table`
              : getQsOverviewPeriodHref(projectId, period)
          }
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          {period === "project-to-date" ? "Back to Rate Analysis" : "Back to period list"}
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          QS Overview · {periodLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {projectName}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500">
          Rolled from valuations entry. Bill cost = bill rate × production. Actual cost = actual rate ×
          production. Margin = bill cost − actual cost (green positive, red negative).
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto px-4 py-4 sm:px-6">
          <table className="w-full min-w-[1200px] border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-900 text-white">
                {QS_OVERVIEW_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`border border-zinc-300 px-3 py-3 font-semibold ${
                      column.align === "left" ? "text-left" : "text-right"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={QS_OVERVIEW_COLUMNS.length}
                    className="border border-zinc-200 px-4 py-10 text-center text-zinc-500"
                  >
                    No saved valuations entry rows for this period yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.dayId}-${row.id}`}>
                    {QS_OVERVIEW_COLUMNS.map((column) => (
                      <td
                        key={column.key}
                        className={`border border-zinc-200 px-3 py-3 ${
                          column.align === "right" ? "text-right tabular-nums" : "text-left"
                        } ${column.key === "margin" ? marginToneClass(row.margin) : "text-zinc-900"}`}
                      >
                        {formatQsOverviewCell(column.key, row[column.key])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="bg-zinc-50 font-semibold">
                  <td colSpan={3} className="border border-zinc-200 px-3 py-3">
                    Totals
                  </td>
                  <td className="border border-zinc-200 px-3 py-3 text-right tabular-nums">
                    {formatQsOverviewCell("production", totals.production)}
                  </td>
                  <td className="border border-zinc-200 px-3 py-3" />
                  <td className="border border-zinc-200 px-3 py-3 text-right tabular-nums">
                    {formatQsOverviewCell("allowableCost", totals.allowableCost)}
                  </td>
                  <td className="border border-zinc-200 px-3 py-3" />
                  <td className="border border-zinc-200 px-3 py-3 text-right tabular-nums">
                    {formatQsOverviewCell("billCost", totals.billCost)}
                  </td>
                  <td className="border border-zinc-200 px-3 py-3 text-right tabular-nums">
                    {formatQsOverviewCell("actualCost", totals.actualCost)}
                  </td>
                  <td className="border border-zinc-200 px-3 py-3" />
                  <td
                    className={`border border-zinc-200 px-3 py-3 text-right tabular-nums ${marginToneClass(
                      totals.actualMargin
                    )}`}
                  >
                    {formatQsOverviewCell("margin", totals.actualMargin)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  )
}
