"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import SiteStaffRegistersView from "@/components/project/SiteStaffRegistersView"

export default function SiteStaffRegistersPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SiteStaffRegistersView projectName={projectName} projectId={projectId} />
      </div>
    </div>
  )
}
