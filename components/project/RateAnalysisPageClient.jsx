"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import RateAnalysisView from "@/components/project/RateAnalysisView"

export default function RateAnalysisPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return null
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <RateAnalysisView projectId={projectId} projectName={project.name} />
      </div>
    </div>
  )
}
