"use client"

import Icon from "@/components/icon/icon"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import ProjectToDateReport from "@/components/project/ProjectToDateReport"
import Link from "next/link"
import { getValuationsHref } from "@/lib/projectRoutes"

export default function ValuationsProjectToDatePageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell space-y-4">
            <Link
              href={getValuationsHref(projectId)}
              className="no-print inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              <Icon name="arrow-left" size={16} />
              Back to Valuations
            </Link>
            <ProjectToDateReport projectName={project.name} projectId={projectId} headerExport />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
