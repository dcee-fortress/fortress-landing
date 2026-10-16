"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import MaterialOnSiteMonthlyListView from "@/components/project/MaterialOnSiteMonthlyListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function MaterialOnSiteMonthlyListPageClient({ projectId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <MaterialOnSiteMonthlyListView projectId={projectId} projectName={project?.name || ""} />
      </div>
    </div>
  )
}
