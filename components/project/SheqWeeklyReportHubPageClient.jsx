"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SheqWeeklyReportHubView from "@/components/project/SheqWeeklyReportHubView"

export default function SheqWeeklyReportHubPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SheqWeeklyReportHubView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
