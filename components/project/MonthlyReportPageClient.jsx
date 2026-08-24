"use client"

import { notFound } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import MonthlyReport from "@/components/project/MonthlyReport"
import { getMonthlyFile } from "@/lib/projects"

export default function MonthlyReportPageClient({ projectId, monthId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const file = getMonthlyFile(projectId, monthId)

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <MonthlyReport projectName={project.name} projectId={projectId} file={file} />
      </div>
    </div>
  )
}
