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
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <PlantOnSiteView projectId={projectId} projectName={project.name} />
      </div>
    </div>
  )
}
