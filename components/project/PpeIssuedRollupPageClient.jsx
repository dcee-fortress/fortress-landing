"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PpeIssuedRollupView from "@/components/project/PpeIssuedRollupView"

export default function PpeIssuedRollupPageClient({
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
        <PpeIssuedRollupView
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
