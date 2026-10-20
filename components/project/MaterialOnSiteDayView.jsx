"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialOnSiteTable from "@/components/project/MaterialOnSiteTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useMaterialOnSiteVersion } from "@/hooks/useMaterialOnSiteVersion"
import { getMaterialOnSiteRows } from "@/lib/materialOnSite"
import { getDailyFile } from "@/lib/projectFiles"
import { getMaterialOnSiteDailyHref, getMaterialOnSiteEntryHref } from "@/lib/projectRoutes"

export default function MaterialOnSiteDayView({ projectId, projectName, dayId }) {
  const { version } = useProjects()
  const entryVersion = useMaterialOnSiteVersion()
  void version
  void entryVersion

  const file = getDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const rows = getMaterialOnSiteRows(projectId, [dayId])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialOnSiteDailyHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily fuel on site
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · Goods on site is goods left from the previous day plus goods
          received today. Goods used comes from the fuel schedule entry, and goods left is what
          stays for the next day.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Daily report</h2>
          <Link
            href={getMaterialOnSiteEntryHref(projectId, dayId)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="table" size={16} />
            Fuel schedule entry
          </Link>
        </div>
        <MaterialOnSiteTable
          rows={rows}
          emptyMessage="No goods on site this day. New goods received, and goods left from the previous day, appear here."
        />
      </section>
    </div>
  )
}
