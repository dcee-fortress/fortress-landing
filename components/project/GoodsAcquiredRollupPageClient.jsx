"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import GoodsAcquiredRollupView from "@/components/project/GoodsAcquiredRollupView"

export default function GoodsAcquiredRollupPageClient({
  projectId,
  title,
  description,
  mode,
}) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <GoodsAcquiredRollupView
          projectId={projectId}
          projectName={project?.name || ""}
          title={title}
          description={description}
          mode={mode}
        />
      </div>
    </div>
  )
}
