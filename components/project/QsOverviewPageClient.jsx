"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import QsOverviewView from "@/components/project/QsOverviewView"

export default function QsOverviewPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <QsOverviewView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
