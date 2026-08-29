import ProgressReportsPageClient from "@/components/project/ProgressReportPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyProgressReportsPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <ProgressReportsPageClient projectId={projectId} reportType="weekly" />
}
