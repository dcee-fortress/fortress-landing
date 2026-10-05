"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import CashBookRollupView from "@/components/project/CashBookRollupView"

export default function CashBookRollupPageClient({
  projectId,
  bookId,
  title,
  description,
  mode,
}) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <CashBookRollupView
          projectId={projectId}
          projectName={project?.name || ""}
          bookId={bookId}
          title={title}
          description={description}
          mode={mode}
        />
      </div>
    </div>
  )
}
