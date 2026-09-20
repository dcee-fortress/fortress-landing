"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SheqSiteInspectionPeriodListView from "@/components/project/SheqSiteInspectionPeriodListView"

export default function SheqSiteInspectionPeriodListPageClient({ projectId, period }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SheqSiteInspectionPeriodListView
          projectId={projectId}
          projectName={projectName}
          period={period}
        />
      </div>
    </div>
  )
}
