"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import ProjectDashboard from "@/components/project/ProjectDashboard"
import { getProjectDashboard } from "@/lib/projects"

export default function ProjectDashboardPageClient({ projectId, view }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return null
  }

  const dashboard = getProjectDashboard(projectId)

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <ProjectDashboard view={view} projectName={project.name} dashboard={dashboard} />
    </div>
  )
}
