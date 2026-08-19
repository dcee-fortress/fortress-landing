import DailyReportPageClient from "@/components/project/DailyReportPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyFilePage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyReportPageClient projectId={projectId} dayId={dayId} />
}
