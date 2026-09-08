"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import ValuationsView from "@/components/project/ValuationsView"

export default function ValuationsPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <ValuationsView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
