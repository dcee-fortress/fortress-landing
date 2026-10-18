"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import GoodsAcquiredDashboardTable from "@/components/project/GoodsAcquiredDashboardTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  getGoodsAcquiredDashboardLinesForDayIds,
  getGoodsAcquiredDayIdsInWeek,
  getGoodsAcquiredWeeklyFile,
} from "@/lib/goodsAcquired"
import { isWeeklyFileInProgress } from "@/lib/periodFiles"
import { getGoodsAcquiredPeriodHref } from "@/lib/projectRoutes"

export default function GoodsAcquiredWeekView({ projectId, projectName, weekId }) {
  const { version } = useProjects()
  void version

  const file = getGoodsAcquiredWeeklyFile(projectId, weekId)
  const inProgress = file ? isWeeklyFileInProgress(file) : false
  const lines = getGoodsAcquiredDashboardLinesForDayIds(
    projectId,
    getGoodsAcquiredDayIdsInWeek(projectId, weekId)
  )

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getGoodsAcquiredPeriodHref(projectId, "weekly")}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to weekly files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Weekly material requested
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {file?.label || weekId}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · This week&apos;s dashboard rolls up daily material requested.
          Matching descriptions are combined
          {inProgress ? " until the week ends." : "."}
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Weekly dashboard</h2>
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
        <GoodsAcquiredDashboardTable
          lines={lines}
          emptyMessage="No material requested in this week yet. Add it on the daily material requested files."
        />
      </section>
    </div>
  )
}
