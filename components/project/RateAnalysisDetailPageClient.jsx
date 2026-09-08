"use client"

import { notFound } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import RateAnalysisDetailView from "@/components/project/RateAnalysisDetailView"
import { getRateAnalysisFile, isValidRateAnalysisPeriod } from "@/lib/rateAnalysis"

export default function RateAnalysisDetailPageClient({ projectId, period, fileId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const file = getRateAnalysisFile(projectId, period, fileId)

  if (!project || !isValidRateAnalysisPeriod(period) || !file) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <RateAnalysisDetailView
          projectName={project.name}
          projectId={projectId}
          period={period}
          file={file}
        />
      </div>
    </div>
  )
}
