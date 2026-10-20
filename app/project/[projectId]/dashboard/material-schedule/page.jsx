import { MaterialScheduleHubPageClient } from "@/components/project/MaterialRegisterPageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialSchedulePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialScheduleHubPageClient projectId={projectId} />
}
