"use client"

import PageLoadingShell from "@/components/project/PageLoadingShell"
import DailyCashBookListView from "@/components/project/DailyCashBookListView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"

export default function DailyCashBookListPageClient({ projectId, bookId }) {
  const { isReady, project } = useHydratedProjectRoute(projectId, () => true)

  if (!isReady) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <DailyCashBookListView
          projectId={projectId}
          projectName={project?.name || ""}
          bookId={bookId}
        />
      </div>
    </div>
  )
}
