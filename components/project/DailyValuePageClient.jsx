"use client"

import DailyValueView from "@/components/project/DailyValueView"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"

export default function DailyValuePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="mx-auto max-w-4xl">
            <DailyValueView projectName={project.name} projectId={projectId} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
