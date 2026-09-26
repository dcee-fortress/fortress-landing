"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import GoodsAcquiredDashboardTable from "@/components/project/GoodsAcquiredDashboardTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  getGoodsAcquiredDashboardLinesForDay,
  hasGoodsAcquiredDataForDay,
} from "@/lib/goodsAcquired"
import {
  getGoodsAcquiredDailyHref,
  getGoodsAcquiredEntryHref,
} from "@/lib/projectRoutes"
import { getDailyFile } from "@/lib/projectFiles"

export default function DailyGoodsAcquiredDayView({ projectId, projectName, dayId }) {
  const { version } = useProjects()
  void version

  const file = getDailyFile(projectId, dayId)
  const dayLabel = file?.label || dayId
  const hasData = hasGoodsAcquiredDataForDay(projectId, dayId)
  const lines = getGoodsAcquiredDashboardLinesForDay(projectId, dayId)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getGoodsAcquiredDailyHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily goods acquired dashboard
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · Description, unit, quantity, and total cost roll up from the
          goods acquired entry. Matching descriptions are combined.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Goods acquired table</h2>
          <Link
            href={getGoodsAcquiredEntryHref(projectId, dayId)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="package" size={16} />
            {hasData ? "Edit entry" : "Goods acquired entry"}
          </Link>
        </div>

        <GoodsAcquiredDashboardTable
          lines={lines}
          emptyMessage="No goods acquired yet. Open Goods acquired entry to add items."
        />
      </section>
    </div>
  )
}
