"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import GoodsReceivedView from "@/components/project/GoodsReceivedView"

export default function GoodsReceivedPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <GoodsReceivedView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
