"use client"

import { useProjects } from "@/components/project/ProjectsProvider"
import RateAnalysisView from "@/components/project/RateAnalysisView"

export default function RateAnalysisPageClient({ projectId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return null
  }

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <RateAnalysisView projectId={projectId} projectName={project.name} />
      </div>
    </div>
  )
}
