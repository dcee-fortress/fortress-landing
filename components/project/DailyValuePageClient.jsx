"use client"

import DailyValueView from "@/components/project/DailyValueView"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"

export default function DailyValuePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <DailyValueView projectName={project.name} projectId={projectId} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
