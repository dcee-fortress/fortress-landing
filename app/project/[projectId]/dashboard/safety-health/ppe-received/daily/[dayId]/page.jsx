import DailyPpeReceivedDayPageClient from "@/components/project/DailyPpeReceivedDayPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyPpeReceivedDayPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyPpeReceivedDayPageClient projectId={projectId} dayId={dayId} />
}
