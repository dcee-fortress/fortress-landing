import { MaterialRegisterDayPageClient } from "@/components/project/MaterialRegisterPageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function BulkMaterialRequestDayPage({ params }) {
  const { projectId, dayId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialRegisterDayPageClient projectId={projectId} dayId={dayId} kind="request" />
}
