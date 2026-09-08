"use client"

import dynamic from "next/dynamic"
import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import {
  ensureProgressReportsExist,
  getProjectDailyProgressReport,
  getProjectProgressReport,
} from "@/lib/progressReports"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"

const ProgressReportView = dynamic(() => import("@/components/project/ProgressReport"), {
  loading: () => <PageLoadingShell />,
})

export default function ProgressReportDetailPageClient({ projectId, reportId, projectName, reportType = "daily" }) {
  const hasHydrated = useHasHydrated()
  if (hasHydrated) {
    ensureDailyFilesThroughToday(projectId)
    ensureProgressReportsExist(projectId)
  }
  const report = hasHydrated
    ? reportType === "daily"
      ? getProjectDailyProgressReport(projectId, reportId)
      : getProjectProgressReport(projectId, reportId)
    : null

  if (hasHydrated && !report) {
    notFound()
  }

  if (!hasHydrated) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-7xl">
        <ProgressReportView
          projectName={projectName}
          projectId={projectId}
          reportId={reportId}
          reportType={reportType}
        />
      </div>
    </div>
  )
}
