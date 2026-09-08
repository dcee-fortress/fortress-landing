"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import MonthlyValueView from "@/components/project/MonthlyValueView"

export default function MonthlyValuePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <MonthlyValueView projectName={project.name} projectId={projectId} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
