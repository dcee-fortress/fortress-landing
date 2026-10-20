"use client"

import QsSchedulesView from "@/components/project/QsSchedulesView"
import { useProjects } from "@/components/project/ProjectsProvider"

export default function QsSchedulesPageClient({ projectId }) {
  const { getProject } = useProjects()
  const projectName = getProject(projectId)?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <QsSchedulesView projectId={projectId} projectName={projectName} />
      </div>
    </div>
  )
}
