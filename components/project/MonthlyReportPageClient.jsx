"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import MonthlyReport from "@/components/project/MonthlyReport"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getMonthlyFile } from "@/lib/projects"

export default function MonthlyReportPageClient({ projectId, monthId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return getMonthlyFile(projectId, monthId)
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <MonthlyReport projectName={project.name} projectId={projectId} file={file} />
      </div>
    </div>
  )
}
