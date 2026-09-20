"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import SheqIncidentDailyListView from "@/components/project/SheqIncidentDailyListView"
import { useHasHydrated } from "@/hooks/useHasHydrated"

export default function SheqIncidentDailyListPageClient({ projectId }) {
  const hasHydrated = useHasHydrated()
  const { getProject } = useProjects()

  if (!hasHydrated) {
    return <PageLoadingShell />
  }

  const project = getProject(projectId)
  const projectName = project?.name || "Project"

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SheqIncidentDailyListView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
