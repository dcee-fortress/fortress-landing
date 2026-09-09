"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PageLoadingShell from "@/components/project/PageLoadingShell"

export default function ProjectPageClientShell({ projectId, className = "", children }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project || project.routePlaceholder) {
    return <PageLoadingShell className={className} />
  }

  return children(project)
}
