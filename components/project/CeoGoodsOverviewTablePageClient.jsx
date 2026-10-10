"use client"

import CeoGoodsOverviewTable from "@/components/project/CeoGoodsOverviewTable"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"

export default function CeoGoodsOverviewTablePageClient({ projectId, mode }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <CeoGoodsOverviewTable
              projectId={projectId}
              projectName={project.name}
              mode={mode}
            />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
