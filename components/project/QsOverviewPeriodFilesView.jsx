"use client"

import { useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { getDailyFiles, getMonthlyFiles, getWeeklyFiles } from "@/lib/projectFiles"
import {
  formatQsOverviewCell,
  getQsOverviewFileHref,
  getQsOverviewHref,
  getQsOverviewRowsForPeriod,
  summarizeQsOverviewRows,
} from "@/lib/qsOverview"

export default function QsOverviewPeriodFilesView({ projectId, projectName, period }) {
  const { version } = useProjectData()

  const files = useMemo(() => {
    void version
    if (period === "daily") return getDailyFiles(projectId)
    if (period === "weekly") return getWeeklyFiles(projectId)
    if (period === "monthly") return getMonthlyFiles(projectId)
    return []
  }, [projectId, period, version])

  const title =
    period === "daily" ? "Daily" : period === "weekly" ? "Weekly" : period === "monthly" ? "Monthly" : period

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={`${getQsOverviewHref(projectId)}/margin-table`}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Rate Analysis
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">QS Overview</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {title}
        </h1>
        <p className="text-sm text-zinc-500">{projectName}</p>
      </header>

      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {files.length === 0 ? (
          <li className="px-6 py-10 text-center text-sm text-zinc-500">No files yet for this period.</li>
        ) : (
          files.map((file) => {
            const totals = summarizeQsOverviewRows(
              getQsOverviewRowsForPeriod(projectId, period, file.id)
            )
            return (
              <li key={file.id}>
                <Link
                  href={getQsOverviewFileHref(projectId, period, file.id)}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{file.label}</p>
                    <p className="text-sm text-zinc-500">
                      Actual cost {formatQsOverviewCell("actualCost", totals.actualCost)} · Margin{" "}
                      {formatQsOverviewCell("margin", totals.actualMargin)}
                    </p>
                  </div>
                  <Icon name="chevron-right" size={18} className="text-zinc-400" />
                </Link>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
