"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import EarnedValueReportTable from "@/components/project/EarnedValueReportTable"
import { useProjectData } from "@/components/project/ProjectDataProvider"

import { getWeeklyValueHref } from "@/lib/projectRoutes"
import { isWeeklyFileInProgress } from "@/lib/periodFiles"

function WeeklyReportContent({ projectName, file, summary, inProgress, onExportPdf }) {
  return (
    <article className="project-report overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-zinc-50 px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {projectName}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900">{file.label}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {inProgress
                ? "Cumulative roll-up from saved hourly dashboards in this week (period in progress)"
                : `File completed: ${file.completedAt}`}
            </p>
          </div>
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
      </div>

      <div className="px-8 py-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Activities Completed on Site
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          {inProgress
            ? "Live cumulative totals from all saved hourly dashboards in this week so far."
            : "Cumulative roll-up from all daily hourly dashboards in this week."}
        </p>
        <EarnedValueReportTable summary={summary} onExportPdf={onExportPdf} />
      </div>
    </article>
  )
}

export default function WeeklyReport({ projectName, projectId, file, embedded = false }) {
  const { getWeekSummary, version } = useProjectData()
  void version
  const summary = getWeekSummary(file.id)
  const inProgress = isWeeklyFileInProgress(file)

  const exportToPdf = async () => {
    const { exportWeeklyReportPdf } = await import("@/lib/earnedValuePdf")
    exportWeeklyReportPdf({ projectName, file, summary })
  }

  if (embedded) {
    return (
      <WeeklyReportContent
        projectName={projectName}
        file={file}
        summary={summary}
        inProgress={inProgress}
        onExportPdf={exportToPdf}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="no-print space-y-2">
        <Link
          href={getWeeklyValueHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to weekly files
        </Link>
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Weekly cost</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{file.label}</h1>
        </header>
      </div>

      <WeeklyReportContent
        projectName={projectName}
        file={file}
        summary={summary}
        inProgress={inProgress}
        onExportPdf={exportToPdf}
      />
    </div>
  )
}
