"use client"

import dynamic from "next/dynamic"
import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import {
  getProjectDailyProgressReport,
  getProjectProgressReport,
} from "@/lib/progressReports"

const ProgressReportView = dynamic(() => import("@/components/project/ProgressReport"), {
  loading: () => <PageLoadingShell className="pt-20" />,
})

export default function ActualProgressUpdatePageClient({ projectId, reportId, projectName, reportType = "daily" }) {
  const hasHydrated = useHasHydrated()
  const report = hasHydrated
    ? reportType === "daily"
      ? getProjectDailyProgressReport(projectId, reportId)
      : getProjectProgressReport(projectId, reportId)
    : null

  if (hasHydrated && !report) {
    notFound()
  }

  if (!hasHydrated) {
    return <PageLoadingShell className="pt-20" />
  }

  return (
    <div
      className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900 pt-20"
      style={{ scrollPaddingTop: "5rem" }}
    >
      <div className="mx-auto max-w-6xl">
        <ProgressReportView
          projectName={projectName}
          projectId={projectId}
          reportId={reportId}
          reportType={reportType}
          pageVariant="actual-progress-update"
        />
      </div>
    </div>
  )
}
