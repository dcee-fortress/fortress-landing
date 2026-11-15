import ActualCostAnalysisPageClient from "@/components/project/ActualCostAnalysisPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ActualCostAnalysisPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <ActualCostAnalysisPageClient projectId={projectId} />
}
