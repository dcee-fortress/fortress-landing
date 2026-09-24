import SheqWeeklyReportWeekListPageClient from "@/components/project/SheqWeeklyReportWeekListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SheqWeeklyTargetReportListPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SheqWeeklyReportWeekListPageClient projectId={projectId} variant="target" />
}
