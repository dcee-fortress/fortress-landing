"use client"

import DailyValueView from "@/components/project/DailyValueView"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"

export default function DailyValuePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
          <div className="mx-auto max-w-4xl">
            <DailyValueView projectName={project.name} projectId={projectId} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
