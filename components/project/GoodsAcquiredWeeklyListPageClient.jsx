"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import GoodsAcquiredWeeklyListView from "@/components/project/GoodsAcquiredWeeklyListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function GoodsAcquiredWeeklyListPageClient({ projectId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <GoodsAcquiredWeeklyListView projectId={projectId} projectName={project?.name || ""} />
      </div>
    </div>
  )
}
