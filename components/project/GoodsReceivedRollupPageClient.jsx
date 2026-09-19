"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import GoodsReceivedRollupView from "@/components/project/GoodsReceivedRollupView"

export default function GoodsReceivedRollupPageClient({
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
        <GoodsReceivedRollupView
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
