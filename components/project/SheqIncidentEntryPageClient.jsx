"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import SheqIncidentEntryView from "@/components/project/SheqIncidentEntryView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getSheqIncidentDailyFile } from "@/lib/sheqIncident"

export default function SheqIncidentEntryPageClient({ projectId, dayId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return getSheqIncidentDailyFile(projectId, dayId)
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="app-page-frame min-w-0 text-zinc-900">
      <div className="app-content-shell mx-auto w-full min-w-0">
        <SheqIncidentEntryView
          projectId={projectId}
          projectName={project.name}
          dayId={dayId}
        />
      </div>
    </div>
  )
}
