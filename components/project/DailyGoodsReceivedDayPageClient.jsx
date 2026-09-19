"use client"

import { notFound } from "next/navigation"
import DailyGoodsReceivedDayView from "@/components/project/DailyGoodsReceivedDayView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getDailyFile } from "@/lib/projectFiles"

export default function DailyGoodsReceivedDayPageClient({ projectId, dayId }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(
    projectId,
    () => getDailyFile(projectId, dayId)
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
        <DailyGoodsReceivedDayView
          projectId={projectId}
          projectName={project?.name || ""}
          dayId={dayId}
        />
      </div>
    </div>
  )
}
