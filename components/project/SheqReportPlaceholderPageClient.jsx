"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SheqReportPlaceholderView from "@/components/project/SheqReportPlaceholderView"

export default function SheqReportPlaceholderPageClient({
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
        <SheqReportPlaceholderView
          projectId={projectId}
          projectName={projectName}
          title={title}
          description={description}
        />
      </div>
    </div>
  )
}
