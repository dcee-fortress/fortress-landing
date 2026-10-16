"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import MaterialOnSiteDailyListView from "@/components/project/MaterialOnSiteDailyListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function MaterialOnSiteDailyListPageClient({ projectId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <MaterialOnSiteDailyListView projectId={projectId} projectName={project?.name || ""} />
      </div>
    </div>
  )
}
