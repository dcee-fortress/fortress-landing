"use client"

import MaterialOnSiteHubView from "@/components/project/MaterialOnSiteHubView"
import { useProjects } from "@/components/project/ProjectsProvider"

export default function MaterialOnSiteHubPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <MaterialOnSiteHubView projectId={projectId} projectName={project?.name || ""} />
      </div>
    </div>
  )
}
