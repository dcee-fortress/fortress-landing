"use client"

import { notFound } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import PageLoadingShell from "@/components/project/PageLoadingShell"

export default function ProjectPageClientShell({ projectId, className = "", children }) {
  const { getProject, syncReady } = useProjects()
  const project = getProject(projectId)

  if (!project || project.routePlaceholder) {
    if (!syncReady) {
      return <PageLoadingShell className={className} />
    }
    notFound()
  }

  return children(project)
}
