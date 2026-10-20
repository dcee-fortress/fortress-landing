import { MaterialSiteEntryPageClient } from "@/components/project/MaterialSitePageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialSiteEntryPage({ params }) {
  const { projectId, dayId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialSiteEntryPageClient projectId={projectId} dayId={dayId} />
}
