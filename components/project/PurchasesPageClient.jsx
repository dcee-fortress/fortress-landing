"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PurchasesView from "@/components/project/PurchasesView"

export default function PurchasesPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <PurchasesView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
