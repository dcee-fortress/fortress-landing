import { MaterialAnalysisPageClient } from "@/components/project/MaterialSitePageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialAnalysisPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialAnalysisPageClient projectId={projectId} />
}
