"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PettyCashPeriodPlaceholderView from "@/components/project/PettyCashPeriodPlaceholderView"

export default function PettyCashPeriodPlaceholderPageClient({
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
        <PettyCashPeriodPlaceholderView
          projectId={projectId}
          projectName={projectName}
          title={title}
          description={description}
        />
      </div>
    </div>
  )
}
