"use client"

import { notFound } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import WeeklyReport from "@/components/project/WeeklyReport"
import { getWeeklyFile } from "@/lib/projects"

export default function WeeklyReportPageClient({ projectId, weekId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const file = getWeeklyFile(projectId, weekId)

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <WeeklyReport projectName={project.name} projectId={projectId} file={file} />
      </div>
    </div>
  )
}
