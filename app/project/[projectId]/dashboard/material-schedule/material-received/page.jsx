import { MaterialRegisterHubPageClient } from "@/components/project/MaterialRegisterPageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialReceivedPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialRegisterHubPageClient projectId={projectId} kind="received" />
}
