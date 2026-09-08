"use client"

import dynamic from "next/dynamic"
import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import {
  ensureProgressReportsExist,
  getProjectDailyProgressReport,
  getProjectProgressReport,
} from "@/lib/progressReports"

const ProgressReportView = dynamic(() => import("@/components/project/ProgressReport"), {
  loading: () => <PageLoadingShell />,
})

export default function ProgressReportDetailPageClient({
  projectId,
  reportId,
  projectName,
  reportType = "daily",
}) {
  const { isReady, project, item: report } = useHydratedProjectRoute(projectId, () => {
    ensureProgressReportsExist(projectId)
    return reportType === "daily"
      ? getProjectDailyProgressReport(projectId, reportId)
      : getProjectProgressReport(projectId, reportId)
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !report) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-7xl">
        <ProgressReportView
          projectName={projectName || project.name}
          projectId={projectId}
          reportId={reportId}
          reportType={reportType}
        />
      </div>
    </div>
  )
}
