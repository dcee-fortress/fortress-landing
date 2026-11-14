"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import SiteReport from "@/components/project/SiteReport"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getDailyFile, getMonthlyFile, getWeeklyFile } from "@/lib/projectFiles"

function findSiteReportFile(projectId, period, fileId) {
  if (period === "weekly") return getWeeklyFile(projectId, fileId)
  if (period === "monthly") return getMonthlyFile(projectId, fileId)
  return getDailyFile(projectId, fileId)
}

export default function SiteReportPageClient({ projectId, period, fileId }) {
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    findSiteReportFile(projectId, period, fileId)
  )

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <SiteReport projectName={project.name} projectId={projectId} period={period} file={file} />
      </div>
    </div>
  )
}
