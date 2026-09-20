"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import SheqSiteInspectionEntryView from "@/components/project/SheqSiteInspectionEntryView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getSheqSiteInspectionPeriodFile } from "@/lib/sheqSiteInspection"

export default function SheqSiteInspectionEntryPageClient({ projectId, period, periodId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return getSheqSiteInspectionPeriodFile(projectId, period, periodId)
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="app-page-frame min-w-0 text-zinc-900">
      <div className="app-content-shell mx-auto w-full min-w-0">
        <SheqSiteInspectionEntryView
          projectId={projectId}
          projectName={project.name}
          period={period}
          periodId={periodId}
        />
      </div>
    </div>
  )
}
