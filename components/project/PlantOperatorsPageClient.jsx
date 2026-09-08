"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PlantOperatorsView from "@/components/project/PlantOperatorsView"

export default function PlantOperatorsPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return null
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <PlantOperatorsView projectName={project.name} projectId={projectId} />
      </div>
    </div>
  )
}
