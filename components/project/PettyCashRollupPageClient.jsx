"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PettyCashRollupView from "@/components/project/PettyCashRollupView"

export default function PettyCashRollupPageClient({
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
        <PettyCashRollupView
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
