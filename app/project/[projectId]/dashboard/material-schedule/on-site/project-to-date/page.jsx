import { MaterialSiteRollupPageClient } from "@/components/project/MaterialSitePageClients"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialSiteProjectPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialSiteRollupPageClient projectId={projectId} />
}
