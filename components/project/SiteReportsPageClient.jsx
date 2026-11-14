"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import SiteReportsView from "@/components/project/SiteReportsView"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"

export default function SiteReportsPageClient({ projectId, period = null }) {
  const { getProject } = useProjects()
  const hasHydrated = useHasHydrated()
  const project = getProject(projectId)

  if (!hasHydrated) {
    return <PageLoadingShell />
  }

  if (!project) {
    return null
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SiteReportsView projectId={projectId} projectName={project.name} period={period} />
      </div>
    </div>
  )
}
