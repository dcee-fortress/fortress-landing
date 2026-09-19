"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import FinanceModulePlaceholderView from "@/components/project/FinanceModulePlaceholderView"

export default function FinanceModulePlaceholderPageClient({
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
        <FinanceModulePlaceholderView
          projectId={projectId}
          projectName={projectName}
          title={title}
          description={description}
        />
      </div>
    </div>
  )
}
