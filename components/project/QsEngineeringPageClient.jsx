"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import QsEngineeringView from "@/components/project/QsEngineeringView"

export default function QsEngineeringPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <QsEngineeringView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
