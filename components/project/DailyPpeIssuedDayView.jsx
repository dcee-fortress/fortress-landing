"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import PpeIssuedDashboardTable from "@/components/project/PpeIssuedDashboardTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import {
  formatPpeIssuedDateLabel,
  getPpeIssuedDashboardLinesForDay,
  getPpeIssuedDailyFile,
  hasPpeIssuedDataForDay,
} from "@/lib/ppeIssued"
import {
  getPpeIssuedDailyHref,
  getPpeIssuedEntryHref,
} from "@/lib/projectRoutes"

export default function DailyPpeIssuedDayView({ projectId, projectName, dayId }) {
  const { version } = useProjects()
  void version

  const file = getPpeIssuedDailyFile(projectId, dayId)
  const dayLabel = file?.label || formatPpeIssuedDateLabel(dayId) || dayId
  const hasData = hasPpeIssuedDataForDay(projectId, dayId)
  const lines = getPpeIssuedDashboardLinesForDay(projectId, dayId)

  function exportToPdf() {
    void import("@/lib/safetyReportPdf").then(({ exportPpeIssuedDashboardPdf }) => {
      exportPpeIssuedDashboardPdf({
        projectName,
        title: "Daily PPE issued dashboard",
        periodLabel: dayLabel,
        lines,
      })
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Link
              href={getPpeIssuedDailyHref(projectId)}
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              <Icon name="arrow-left" size={16} />
              Back to daily files
            </Link>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Daily PPE issued dashboard
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
              {dayLabel}
            </h1>
            <p className="text-sm text-zinc-500 sm:text-base">
              {projectName || "Project"} · PPE description, quantities, and total cost roll up from
              the PPE issued entry. Matching descriptions are combined.
            </p>
          </div>
          <ExportPdfButton onClick={exportToPdf} />
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">PPE issued table</h2>
          <Link
            href={getPpeIssuedEntryHref(projectId, dayId)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Icon name="hard-hat" size={16} />
            {hasData ? "Edit entry" : "PPE issued entry"}
          </Link>
        </div>

        <PpeIssuedDashboardTable
          lines={lines}
          emptyMessage="No PPE issued yet. Open PPE issued entry to add items."
        />
      </section>
    </div>
  )
}
