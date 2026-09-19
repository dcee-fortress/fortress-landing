"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import PersonalProtectiveEquipmentView from "@/components/project/PersonalProtectiveEquipmentView"

export default function PersonalProtectiveEquipmentPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <PersonalProtectiveEquipmentView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
