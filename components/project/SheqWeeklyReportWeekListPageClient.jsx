"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SheqWeeklyReportWeekListView from "@/components/project/SheqWeeklyReportWeekListView"

export default function SheqWeeklyReportWeekListPageClient({ projectId, variant = "actual" }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SheqWeeklyReportWeekListView
          projectId={projectId}
          projectName={projectName}
          variant={variant}
        />
      </div>
    </div>
  )
}
