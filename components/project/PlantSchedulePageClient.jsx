"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import PlantScheduleView from "@/components/project/PlantScheduleView"

export default function PlantSchedulePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <PlantScheduleView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
