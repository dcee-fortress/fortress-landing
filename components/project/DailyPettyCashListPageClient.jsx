"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import DailyPettyCashListView from "@/components/project/DailyPettyCashListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function DailyPettyCashListPageClient({ projectId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <DailyPettyCashListView projectId={projectId} projectName={project?.name || ""} />
      </div>
    </div>
  )
}
