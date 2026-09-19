"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import FinanceView from "@/components/project/FinanceView"

export default function FinancePageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  // Paint the hub buttons immediately — do not wait on sync or a loading shell.
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <FinanceView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
