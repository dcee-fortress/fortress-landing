import DailyPettyCashDayPageClient from "@/components/project/DailyPettyCashDayPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyPettyCashDayPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId) || !/^\d{4}-\d{2}-\d{2}$/.test(dayId)) {
    notFound()
  }

  return <DailyPettyCashDayPageClient projectId={projectId} dayId={dayId} />
}
