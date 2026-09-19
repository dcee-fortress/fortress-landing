"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import DailyGoodsReceivedListView from "@/components/project/DailyGoodsReceivedListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function DailyGoodsReceivedListPageClient({ projectId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <DailyGoodsReceivedListView
          projectId={projectId}
          projectName={project?.name || ""}
        />
      </div>
    </div>
  )
}
