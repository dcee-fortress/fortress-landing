import RateAnalysisPageClient from "@/components/project/RateAnalysisPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function RateAnalysisPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <RateAnalysisPageClient projectId={projectId} />
}
