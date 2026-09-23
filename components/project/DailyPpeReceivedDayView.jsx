"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import PpeReceivedDashboardTable from "@/components/project/PpeReceivedDashboardTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  formatPpeReceivedDateLabel,
  getPpeReceivedDashboardLinesForDay,
  getPpeReceivedDailyFile,
  hasPpeReceivedDataForDay,
} from "@/lib/ppeReceived"
import {
  getPpeReceivedDailyHref,
  getPpeReceivedEntryHref,
} from "@/lib/projectRoutes"

export default function DailyPpeReceivedDayView({ projectId, projectName, dayId }) {
  const { version } = useProjects()
  void version

  const file = getPpeReceivedDailyFile(projectId, dayId)
  const dayLabel = file?.label || formatPpeReceivedDateLabel(dayId) || dayId
  const hasData = hasPpeReceivedDataForDay(projectId, dayId)
  const lines = getPpeReceivedDashboardLinesForDay(projectId, dayId)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getPpeReceivedDailyHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to daily files
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily PPE received dashboard
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          {dayLabel}
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          {projectName || "Project"} · PPE description, quantities, and total cost roll up from
          the PPE received entry. Matching descriptions are combined.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">PPE received table</h2>
          <Link
            href={getPpeReceivedEntryHref(projectId, dayId)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="hard-hat" size={16} />
            {hasData ? "Edit entry" : "PPE received entry"}
          </Link>
        </div>

        <PpeReceivedDashboardTable
          lines={lines}
          emptyMessage="No PPE received yet. Open PPE received entry to add items."
        />
      </section>
    </div>
  )
}
