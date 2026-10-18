import DailyGoodsReceivedListPageClient from "@/components/project/DailyGoodsReceivedListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyGoodsReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyGoodsReceivedListPageClient projectId={projectId} />
}
