import SheqWeeklyReportHubPageClient from "@/components/project/SheqWeeklyReportHubPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SheqWeeklyReportHubPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SheqWeeklyReportHubPageClient projectId={projectId} />
}
