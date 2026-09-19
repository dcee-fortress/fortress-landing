"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PpeIssuedView from "@/components/project/PpeIssuedView"

export default function PpeIssuedPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <PpeIssuedView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
