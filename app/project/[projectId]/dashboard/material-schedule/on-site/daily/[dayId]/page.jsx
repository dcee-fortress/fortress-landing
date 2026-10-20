import { MaterialSiteDayPageClient } from "@/components/project/MaterialSitePageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialSiteDayPage({ params }) {
  const { projectId, dayId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialSiteDayPageClient projectId={projectId} dayId={dayId} />
}
