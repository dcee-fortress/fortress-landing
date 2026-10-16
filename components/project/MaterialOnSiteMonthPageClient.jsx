"use client"

import { notFound } from "next/navigation"
import MaterialOnSiteMonthView from "@/components/project/MaterialOnSiteMonthView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getMaterialOnSiteMonthlyFile } from "@/lib/materialOnSite"

export default function MaterialOnSiteMonthPageClient({ projectId, monthId }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    getMaterialOnSiteMonthlyFile(projectId, monthId)
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
        <MaterialOnSiteMonthView
          projectId={projectId}
          projectName={project?.name || ""}
          monthId={monthId}
        />
      </div>
    </div>
  )
}
