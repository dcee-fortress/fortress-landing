import SheqIncidentEntryPageClient from "@/components/project/SheqIncidentEntryPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SheqIncidentDailyEntryPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SheqIncidentEntryPageClient projectId={projectId} dayId={dayId} />
}
