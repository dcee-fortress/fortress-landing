"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import QsMarginTableView from "@/components/project/QsMarginTableView"

export default function QsMarginTablePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <QsMarginTableView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
