import WeeklyReportPageClient from "@/components/project/WeeklyReportPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyFilePage({ params }) {
  const { projectId, weekId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <WeeklyReportPageClient projectId={projectId} weekId={weekId} />
}
