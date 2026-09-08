"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import WeeklyReport from "@/components/project/WeeklyReport"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getWeeklyFile } from "@/lib/projects"

export default function WeeklyReportPageClient({ projectId, weekId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return getWeeklyFile(projectId, weekId)
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
        <WeeklyReport projectName={project.name} projectId={projectId} file={file} />
      </div>
    </div>
  )
}
