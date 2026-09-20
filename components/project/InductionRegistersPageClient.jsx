"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import InductionRegistersView from "@/components/project/InductionRegistersView"

export default function InductionRegistersPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <InductionRegistersView projectName={projectName} projectId={projectId} />
      </div>
    </div>
  )
}
