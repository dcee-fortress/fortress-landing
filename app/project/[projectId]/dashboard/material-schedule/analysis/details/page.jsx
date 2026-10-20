import { MaterialAnalysisDetailsPageClient } from "@/components/project/MaterialSitePageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialAnalysisDetailsPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialAnalysisDetailsPageClient projectId={projectId} />
}
