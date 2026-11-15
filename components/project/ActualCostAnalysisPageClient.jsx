"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import ActualCostAnalysisView from "@/components/project/ActualCostAnalysisView"

export default function ActualCostAnalysisPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) return null

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <ActualCostAnalysisView projectId={projectId} projectName={project.name} />
      </div>
    </div>
  )
}
