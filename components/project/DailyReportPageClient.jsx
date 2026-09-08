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
    <div className="report-page-scroll p-6 pb-20" style={{ backgroundColor: "#fafafa", color: "#18181b" }}>
      <div className="mx-auto max-w-6xl">
        <DailyReport projectName={project.name} projectId={projectId} file={file} />
      </div>
    </div>
  )
}
