"use client"

import { notFound } from "next/navigation"
import MaterialOnSiteWeekView from "@/components/project/MaterialOnSiteWeekView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getMaterialOnSiteWeeklyFile } from "@/lib/materialOnSite"

export default function MaterialOnSiteWeekPageClient({ projectId, weekId }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    getMaterialOnSiteWeeklyFile(projectId, weekId)
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
        <MaterialOnSiteWeekView
          projectId={projectId}
          projectName={project?.name || ""}
          weekId={weekId}
        />
      </div>
    </div>
  )
}
