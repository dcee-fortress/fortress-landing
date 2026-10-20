import { MaterialRegisterRollupPageClient } from "@/components/project/MaterialRegisterPageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function BulkMaterialRequestProjectToDatePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialRegisterRollupPageClient projectId={projectId} kind="request" />
}
