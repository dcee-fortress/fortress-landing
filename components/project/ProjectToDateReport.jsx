"use client"

import ProjectToDateCostCard from "@/components/project/ProjectToDateCostCard"
import { useProjectData } from "@/components/project/ProjectDataProvider"

export default function ProjectToDateReport({ projectName }) {
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
    exportProjectToDatePdf({ projectName, summary, reportDate })
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
        id="project-to-date-report"
        className="project-report overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm"
      >
        <div className="border-b border-zinc-200 bg-zinc-50 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Project to Date Report
          </p>
          <h2 className="mt-1 text-2xl font-bold text-zinc-900">{projectName}</h2>
          <p className="mt-1 text-sm text-zinc-500">Report date: {reportDate}</p>
        </div>

        <div className="px-8 py-6">
          <ProjectToDateCostCard summary={summary} onExportPdf={exportToPdf} />
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 px-8 py-4 text-xs text-zinc-500">
          Generated for {projectName} · All amounts in USD
        </div>
      </article>
    </div>
  )
}
