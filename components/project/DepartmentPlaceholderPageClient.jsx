"use client"

import DepartmentPlaceholderView from "@/components/project/DepartmentPlaceholderView"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"

export default function DepartmentPlaceholderPageClient({
  projectId,
  title,
  description,
}) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <DepartmentPlaceholderView
              projectId={projectId}
              projectName={project.name}
              title={title}
              description={description}
            />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
