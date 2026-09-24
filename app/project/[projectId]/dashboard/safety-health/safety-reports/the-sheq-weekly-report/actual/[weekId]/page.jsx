import SheqWeeklyReportPageClient from "@/components/project/SheqWeeklyReportPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SheqWeeklyActualReportWeekPage({ params }) {
  const { projectId, weekId } = await params

  if (!isActiveProject(projectId) || !/^\d{4}-\d{2}-\d{2}$/.test(String(weekId || ""))) {
    notFound()
  }

  return (
    <SheqWeeklyReportPageClient projectId={projectId} weekId={weekId} variant="actual" />
  )
}
