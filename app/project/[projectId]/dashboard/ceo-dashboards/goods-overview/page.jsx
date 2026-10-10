import CeoGoodsOverviewPageClient from "@/components/project/CeoGoodsOverviewPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function CeoGoodsOverviewPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <CeoGoodsOverviewPageClient projectId={projectId} />
}
