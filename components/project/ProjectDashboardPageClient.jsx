"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import ProjectDashboard from "@/components/project/ProjectDashboard"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getProjectDashboard } from "@/lib/projects"

export default function ProjectDashboardPageClient({ projectId, view }) {
  const { version } = useProjects()
  const { isReady, project } = useHydratedProjectRoute(projectId, () => {
    void version
    return true
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project) {
    return <PageLoadingShell />
  }

  const dashboard = getProjectDashboard(projectId)

  return (
    <div className="app-page-frame text-zinc-900">
      <ProjectDashboard view={view} projectName={project.name} dashboard={dashboard} />
    </div>
  )
}
