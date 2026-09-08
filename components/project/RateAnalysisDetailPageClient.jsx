"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import RateAnalysisDetailView from "@/components/project/RateAnalysisDetailView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getRateAnalysisFile, isValidRateAnalysisPeriod } from "@/lib/rateAnalysis"

export default function RateAnalysisDetailPageClient({ projectId, period, fileId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    if (!isValidRateAnalysisPeriod(period)) return null
    return getRateAnalysisFile(projectId, period, fileId)
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !file) {
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
