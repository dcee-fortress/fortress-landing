"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PpeRegistersView from "@/components/project/PpeRegistersView"

export default function PpeRegistersPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <PpeRegistersView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
