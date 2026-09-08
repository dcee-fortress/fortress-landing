"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import WeeklyValueView from "@/components/project/WeeklyValueView"

export default function WeeklyValuePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="mx-auto max-w-4xl">
            <WeeklyValueView projectName={project.name} projectId={projectId} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
