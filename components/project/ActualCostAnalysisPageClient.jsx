"use client"

import { useRouter } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import ActualCostAnalysisView from "@/components/project/ActualCostAnalysisView"
import { getRateAnalysisHubHref } from "@/lib/rateAnalysis"

export default function ActualCostAnalysisPageClient({ projectId }) {
  const router = useRouter()
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) return null

  return (
    <ActualCostAnalysisView
      projectId={projectId}
      projectName={project.name}
      onClose={() => router.push(getRateAnalysisHubHref(projectId))}
    />
  )
}
