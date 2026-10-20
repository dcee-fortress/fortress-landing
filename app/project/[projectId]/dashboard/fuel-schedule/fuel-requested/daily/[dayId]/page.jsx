import DailyGoodsAcquiredDayPageClient from "@/components/project/DailyGoodsAcquiredDayPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyGoodsAcquiredDayPage({ params }) {
  const { projectId, dayId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <DailyGoodsAcquiredDayPageClient projectId={projectId} dayId={dayId} />
}
