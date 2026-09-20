"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SheqSiteInspectionView from "@/components/project/SheqSiteInspectionView"

export default function SheqSiteInspectionPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SheqSiteInspectionView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
