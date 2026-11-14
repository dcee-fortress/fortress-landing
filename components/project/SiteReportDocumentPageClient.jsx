"use client"

import { useMemo } from "react"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import SiteReportDocument from "@/components/project/SiteReportDocument"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { getDailyFile, getMonthlyFile, getWeeklyFile } from "@/lib/projectFiles"

export default function SiteReportDocumentPageClient({ projectId, period, fileId }) {
  const { version } = useProjectData()
  const { getProject } = useProjects()
  const hasHydrated = useHasHydrated()
  const project = getProject(projectId)

  const file = useMemo(() => {
    void version
    if (!hasHydrated) return null
    if (period === "weekly") return getWeeklyFile(projectId, fileId)
    if (period === "monthly") return getMonthlyFile(projectId, fileId)
    return getDailyFile(projectId, fileId)
  }, [hasHydrated, projectId, period, fileId, version])

  if (!hasHydrated) {
    return <PageLoadingShell />
  }

  if (!project) {
    return null
  }

  if (!file) {
    return (
      <div className="app-page-frame text-zinc-900">
        <div className="app-content-shell">
          <p className="text-zinc-600">That site report file is not on this project.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-page-frame bg-zinc-100 text-zinc-900">
      <div className="app-content-shell">
        <SiteReportDocument
          projectId={projectId}
          projectName={project.name}
          period={period}
          file={file}
        />
      </div>
    </div>
  )
}
