import DailyGoodsReceivedDayPageClient from "@/components/project/DailyGoodsReceivedDayPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyGoodsReceivedDayPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyGoodsReceivedDayPageClient projectId={projectId} dayId={dayId} />
}
