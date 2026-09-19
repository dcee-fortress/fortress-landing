"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SafetyHealthView from "@/components/project/SafetyHealthView"

export default function SafetyHealthPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return null
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SafetyHealthView projectId={projectId} projectName={project.name} />
      </div>
    </div>
  )
}
