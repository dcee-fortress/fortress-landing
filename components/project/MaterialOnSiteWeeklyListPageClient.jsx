"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import MaterialOnSiteWeeklyListView from "@/components/project/MaterialOnSiteWeeklyListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function MaterialOnSiteWeeklyListPageClient({ projectId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <MaterialOnSiteWeeklyListView projectId={projectId} projectName={project?.name || ""} />
      </div>
    </div>
  )
}
