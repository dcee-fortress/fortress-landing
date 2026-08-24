"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import ProgressReportView from "@/components/project/ProgressReportView"

export default function ProgressReportsPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return null
  }

  return (
    <div
      className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900 pt-20"
      style={{ scrollPaddingTop: "5rem" }}
    >
      <div className="mx-auto max-w-4xl">
        <ProgressReportView projectName={project.name} projectId={projectId} />
      </div>
    </div>
  )
}
