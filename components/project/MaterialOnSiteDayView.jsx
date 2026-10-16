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
          Daily material on site
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · The material schedule entry rolls into this table. The columns
          are the same: description of good, goods on site, goods used on site, location used, and
          goods left on site.
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
            Material schedule entry
          </Link>
        </div>
        <MaterialOnSiteTable
          rows={rows}
          emptyMessage="No goods were received on this day, so there is nothing on site yet."
        />
      </section>
    </div>
  )
}
