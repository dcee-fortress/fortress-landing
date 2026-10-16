"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialOnSiteTable from "@/components/project/MaterialOnSiteTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useMaterialOnSiteVersion } from "@/hooks/useMaterialOnSiteVersion"
import {
  getMaterialOnSiteMonthDayIds,
  getMaterialOnSiteMonthlyFile,
  getMaterialOnSiteRows,
} from "@/lib/materialOnSite"
import { isMonthlyFileInProgress } from "@/lib/periodFiles"
import { getMaterialOnSiteMonthlyHref } from "@/lib/projectRoutes"

export default function MaterialOnSiteMonthView({ projectId, projectName, monthId }) {
  const { version } = useProjects()
  const entryVersion = useMaterialOnSiteVersion()
  void version
  void entryVersion

  const file = getMaterialOnSiteMonthlyFile(projectId, monthId)
  const inProgress = file ? isMonthlyFileInProgress(file) : false
  const dayIds = getMaterialOnSiteMonthDayIds(projectId, monthId)
  const rows = getMaterialOnSiteRows(projectId, dayIds)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialOnSiteMonthlyHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to monthly files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Monthly material on site
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {file?.label || monthId}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · Each description shows its cumulative quantity for this
          month. {dayIds.length} daily {dayIds.length === 1 ? "file" : "files"} included.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">{file?.label || "Month"}</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              inProgress
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {inProgress ? "In progress" : "Completed"}
          </span>
        </div>
        <MaterialOnSiteTable
          rows={rows}
          emptyMessage="No goods received on the daily material files in this month yet."
        />
      </section>
    </div>
  )
}
