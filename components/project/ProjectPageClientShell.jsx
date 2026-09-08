"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { getProjectForRoute } from "@/lib/projectList"

export default function ProjectPageClientShell({ projectId, className = "", children }) {
  const { getProject } = useProjects()
  const project = getProject(projectId) ?? getProjectForRoute(projectId)

  if (!project) {
    return <PageLoadingShell className={className} />
  }

  return children(project)
}
