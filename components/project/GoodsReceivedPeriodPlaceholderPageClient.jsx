"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import GoodsReceivedPeriodPlaceholderView from "@/components/project/GoodsReceivedPeriodPlaceholderView"

export default function GoodsReceivedPeriodPlaceholderPageClient({
  projectId,
  title,
  description,
}) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <GoodsReceivedPeriodPlaceholderView
          projectId={projectId}
          projectName={projectName}
          title={title}
          description={description}
        />
      </div>
    </div>
  )
}
