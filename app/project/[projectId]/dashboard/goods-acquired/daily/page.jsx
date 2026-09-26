import DailyGoodsAcquiredListPageClient from "@/components/project/DailyGoodsAcquiredListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyGoodsAcquiredPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <DailyGoodsAcquiredListPageClient projectId={projectId} />
}
