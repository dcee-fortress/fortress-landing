"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PettyCashView from "@/components/project/PettyCashView"

export default function PettyCashPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <PettyCashView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
