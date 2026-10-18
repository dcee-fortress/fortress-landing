import GoodsAnalysisPageClient from "@/components/project/GoodsAnalysisPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialAnalysisPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <GoodsAnalysisPageClient projectId={projectId} />
}
