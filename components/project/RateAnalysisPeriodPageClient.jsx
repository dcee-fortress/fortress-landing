"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import RateAnalysisPeriodFilesView from "@/components/project/RateAnalysisPeriodFilesView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { isValidRateAnalysisPeriod } from "@/lib/rateAnalysis"

export default function RateAnalysisPeriodPageClient({ projectId, period }) {
  const { version } = useProjects()
  const { isReady, project } = useHydratedProjectRoute(projectId, () => {
    void version
    return true
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

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
