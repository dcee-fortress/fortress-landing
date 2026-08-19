"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import ValuationsView from "@/components/project/ValuationsView"

export default function ValuationsPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
          <div className="mx-auto max-w-4xl">
            <ValuationsView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
