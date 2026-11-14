"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import { SiteReportsFiles, SiteReportsHub } from "@/components/project/SiteReportsView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function SiteReportsPageClient({ projectId, period = null }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady || !project) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        {period ? (
          <SiteReportsFiles projectName={project.name} projectId={projectId} period={period} />
        ) : (
          <SiteReportsHub projectName={project.name} projectId={projectId} />
        )}
      </div>
    </div>
  )
}
