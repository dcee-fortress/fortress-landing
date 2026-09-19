"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import DailyReport from "@/components/project/DailyReport"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"
import { getDailyFile } from "@/lib/projects"
import { ensureHourlyDashboardsForDay } from "@/lib/projectData"

function resolveDailyFile(projectId, dayId) {
  ensureDailyFilesThroughToday(projectId)
  ensureHourlyDashboardsForDay(projectId, dayId)
  return getDailyFile(projectId, dayId)
}

export default function DailyReportPageClient({ projectId, dayId }) {
  const { version, syncReady } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return resolveDailyFile(projectId, dayId)
  })

  if (!isReady || (!file && !syncReady)) {
    return <PageLoadingShell />
  }

  const resolvedFile = file ?? resolveDailyFile(projectId, dayId)

  if (!project || !resolvedFile) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <DailyReport projectName={project.name} projectId={projectId} file={resolvedFile} />
      </div>
    </div>
  )
}
