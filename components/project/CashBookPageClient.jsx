"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import CashBookView from "@/components/project/CashBookView"

export default function CashBookPageClient({ projectId, bookId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const projectName = project?.name || ""

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <CashBookView projectId={projectId} projectName={projectName} bookId={bookId} />
      </div>
    </div>
  )
}
