import DailyPpeIssuedDayPageClient from "@/components/project/DailyPpeIssuedDayPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyPpeIssuedDayPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyPpeIssuedDayPageClient projectId={projectId} dayId={dayId} />
}
