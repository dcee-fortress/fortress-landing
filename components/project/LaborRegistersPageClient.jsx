"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import LaborRegistersView from "@/components/project/LaborRegistersView"

export default function LaborRegistersPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <LaborRegistersView projectName={projectName} projectId={projectId} />
      </div>
    </div>
  )
}
