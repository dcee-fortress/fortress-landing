"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PlantOnSiteView from "@/components/project/PlantOnSiteView"

export default function PlantOnSitePageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return null
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <PlantOnSiteView projectId={projectId} projectName={project.name} />
      </div>
    </div>
  )
}
