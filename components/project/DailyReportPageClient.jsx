"use client"

import { notFound } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import DailyReport from "@/components/project/DailyReport"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"
import { getDailyFile } from "@/lib/projects"

export default function DailyReportPageClient({ projectId, dayId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (typeof window !== "undefined") {
    ensureDailyFilesThroughToday(projectId)
  }

  const file = getDailyFile(projectId, dayId)

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="report-page-scroll bg-zinc-50 p-6 pb-20 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <DailyReport projectName={project.name} projectId={projectId} file={file} />
      </div>
    </div>
  )
}
