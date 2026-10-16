"use client"

import { notFound } from "next/navigation"
import MaterialOnSiteDayView from "@/components/project/MaterialOnSiteDayView"
import MaterialOnSiteEntryView from "@/components/project/MaterialOnSiteEntryView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getDailyFile } from "@/lib/projectFiles"

export default function MaterialOnSiteDayPageClient({ projectId, dayId, entry = false }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    getDailyFile(projectId, dayId)
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

  const View = entry ? MaterialOnSiteEntryView : MaterialOnSiteDayView

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <View projectId={projectId} projectName={project?.name || ""} dayId={dayId} />
      </div>
    </div>
  )
}
