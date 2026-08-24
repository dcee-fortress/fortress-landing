"use client"

import { useRef } from "react"
import ProjectToDateTotalsTable from "@/components/project/ProjectToDateTotalsTable"
import { useProjectData } from "@/components/project/ProjectDataProvider"

export default function ProjectToDateReport({ projectName, dashboard }) {
  const reportRef = useRef(null)
  const { getProjectSummary, version } = useProjectData()
  void version
  const summary = getProjectSummary()

  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const exportToPdf = async () => {
    const { exportProjectToDatePdf } = await import("@/lib/earnedValuePdf")
    exportProjectToDatePdf({ projectName, dashboard, summary, reportDate })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Project to Date Report
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
      </header>

      <article
        ref={reportRef}
        id="project-to-date-report"
        className="project-report overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm"
      >
        <div className="border-b border-zinc-200 bg-zinc-50 px-8 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Project to Date Report
              </p>
              <h2 className="mt-1 text-2xl font-bold text-zinc-900">{projectName}</h2>
              <p className="mt-1 text-sm text-zinc-500">Report date: {reportDate}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              {dashboard.mainActivity.status}
            </span>
          </div>
        </div>

        <div className="border-b border-zinc-200 px-8 py-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Main Activity on Site
          </h3>
          <p className="mt-2 font-medium text-zinc-900">{dashboard.mainActivity.title}</p>
          <p className="mt-2 leading-relaxed text-zinc-600">{dashboard.mainActivity.description}</p>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: {dashboard.mainActivity.lastUpdated}
          </p>
        </div>

        <div className="px-8 py-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Project to Date Grand Total
          </h3>
          <p className="mb-4 text-sm text-zinc-500">
            Cumulative totals from every hourly dashboard saved on site — actual cost on site
            and production rolled up from material schedules. No activity descriptions on this
            report.
          </p>
          <ProjectToDateTotalsTable summary={summary} onExportPdf={exportToPdf} />
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 px-8 py-4 text-xs text-zinc-500">
          Generated for {projectName} · All amounts in USD · Data saved in this browser
        </div>
      </article>
    </div>
  )
}
