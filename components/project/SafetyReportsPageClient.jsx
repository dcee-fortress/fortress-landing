"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SafetyReportsView from "@/components/project/SafetyReportsView"

export default function SafetyReportsPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SafetyReportsView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
