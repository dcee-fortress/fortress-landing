"use client"

import { useState } from "react"
import { useProjects } from "@/components/project/ProjectsProvider"
import ProgressReportView from "@/components/project/ProgressReportView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHasHydrated } from "@/hooks/useHasHydrated"

export default function ProgressReportsPageClient({ projectId, reportType = null }) {
  const { getProject } = useProjects()
  const hasHydrated = useHasHydrated()
  const [selectedReportType, setSelectedReportType] = useState(reportType)
  const project = getProject(projectId)

  if (!hasHydrated) {
    return <PageLoadingShell className="pt-20" />
  }

  if (!project) {
    return null
  }

  return (
    <div
      className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900 pt-20"
      style={{ scrollPaddingTop: "5rem" }}
    >
      <div className="mx-auto max-w-4xl">
        <ProgressReportView
          projectName={project.name}
          projectId={projectId}
          reportType={selectedReportType}
          onSelectType={setSelectedReportType}
        />
      </div>
    </div>
  )
}
