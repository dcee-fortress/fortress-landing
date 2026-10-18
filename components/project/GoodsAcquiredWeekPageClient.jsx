"use client"

import { notFound } from "next/navigation"
import GoodsAcquiredWeekView from "@/components/project/GoodsAcquiredWeekView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getGoodsAcquiredWeeklyFile } from "@/lib/goodsAcquired"

export default function GoodsAcquiredWeekPageClient({ projectId, weekId }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    getGoodsAcquiredWeeklyFile(projectId, weekId)
  )

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (syncReady && !file) {
    notFound()
  }

  if (!file) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <GoodsAcquiredWeekView
          projectId={projectId}
          projectName={project?.name || ""}
          weekId={weekId}
        />
      </div>
    </div>
  )
}
