"use client"

import CeoDashboardsView from "@/components/project/CeoDashboardsView"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"

export default function CeoDashboardsPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <CeoDashboardsView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
