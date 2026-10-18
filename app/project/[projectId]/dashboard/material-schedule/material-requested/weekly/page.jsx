import GoodsAcquiredWeeklyListPageClient from "@/components/project/GoodsAcquiredWeeklyListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsAcquiredweeklyPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <GoodsAcquiredWeeklyListPageClient projectId={projectId} />
}
