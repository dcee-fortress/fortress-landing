"use client"

import { notFound } from "next/navigation"
import DailyPpeReceivedDayView from "@/components/project/DailyPpeReceivedDayView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getDailyFile } from "@/lib/projectFiles"

export default function DailyPpeReceivedDayPageClient({ projectId, dayId }) {
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
        <DailyPpeReceivedDayView
          projectId={projectId}
          projectName={project?.name || ""}
          dayId={dayId}
        />
      </div>
    </div>
  )
}
