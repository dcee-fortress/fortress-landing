"use client"

import { notFound } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import RateAnalysisPeriodFilesView from "@/components/project/RateAnalysisPeriodFilesView"
import { isValidRateAnalysisPeriod } from "@/lib/rateAnalysis"

export default function RateAnalysisPeriodPageClient({ projectId, period }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project || !isValidRateAnalysisPeriod(period)) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <RateAnalysisPeriodFilesView
          projectName={project.name}
          projectId={projectId}
          period={period}
        />
      </div>
    </div>
  )
}
