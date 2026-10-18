"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import EngineeringView from "@/components/project/EngineeringView"

export default function EngineeringPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <EngineeringView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
