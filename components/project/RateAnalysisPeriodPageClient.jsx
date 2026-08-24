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
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <RateAnalysisPeriodFilesView
          projectName={project.name}
          projectId={projectId}
          period={period}
        />
      </div>
    </div>
  )
}
