import { MaterialRegisterEntryPageClient } from "@/components/project/MaterialRegisterPageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialReceivedEntryPage({ params }) {
  const { projectId, dayId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialRegisterEntryPageClient projectId={projectId} dayId={dayId} kind="received" />
}
