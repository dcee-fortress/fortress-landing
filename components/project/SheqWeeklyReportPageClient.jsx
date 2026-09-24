"use client"

import dynamic from "next/dynamic"
import { useProjects } from "@/components/project/ProjectsProvider"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getSheqWeeklyReportFile } from "@/lib/sheqWeeklyReport"
import { notFound } from "next/navigation"

const SheqWeeklyReportView = dynamic(() => import("@/components/project/SheqWeeklyReportView"), {
  ssr: false,
  loading: () => <PageLoadingShell />,
})

export default function SheqWeeklyReportPageClient({
  projectId,
  weekId,
  variant = "actual",
}) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(
    projectId,
    () => getSheqWeeklyReportFile(projectId, weekId, variant)
  )

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (syncReady && !file) {
    notFound()
  }

  if (!file) {
    return <PageLoadingShell />
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">
        <SheqWeeklyReportView
          projectId={projectId}
          projectName={project?.name || ""}
          weekId={weekId}
          weekLabel={file.label}
          variant={variant}
        />
      </div>
    </div>
  )
}
