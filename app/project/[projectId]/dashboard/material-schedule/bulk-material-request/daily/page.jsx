import { MaterialRegisterDailyPageClient } from "@/components/project/MaterialRegisterPageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function BulkMaterialRequestDailyPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialRegisterDailyPageClient projectId={projectId} kind="request" />
}
