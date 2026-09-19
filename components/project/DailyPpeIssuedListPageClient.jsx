"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import DailyPpeIssuedListView from "@/components/project/DailyPpeIssuedListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function DailyPpeIssuedListPageClient({ projectId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <DailyPpeIssuedListView
          projectId={projectId}
          projectName={project?.name || ""}
        />
      </div>
    </div>
  )
}
