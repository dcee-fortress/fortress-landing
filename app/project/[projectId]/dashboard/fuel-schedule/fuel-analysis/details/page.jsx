import { GoodsAnalysisDetailsPageClient } from "@/components/project/GoodsAnalysisPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function FuelAnalysisDetailsPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <GoodsAnalysisDetailsPageClient projectId={projectId} />
}
