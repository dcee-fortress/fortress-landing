"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import DailyGoodsAcquiredListView from "@/components/project/DailyGoodsAcquiredListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function DailyGoodsAcquiredListPageClient({ projectId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <DailyGoodsAcquiredListView
          projectId={projectId}
          projectName={project?.name || ""}
        />
      </div>
    </div>
  )
}
