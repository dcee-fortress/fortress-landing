import SheqIncidentDailyListPageClient from "@/components/project/SheqIncidentDailyListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SheqIncidentReportPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SheqIncidentDailyListPageClient projectId={projectId} />
}
