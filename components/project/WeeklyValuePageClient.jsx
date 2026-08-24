"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import WeeklyValueView from "@/components/project/WeeklyValueView"

export default function WeeklyValuePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
          <div className="mx-auto max-w-4xl">
            <WeeklyValueView projectName={project.name} projectId={projectId} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
