import MaterialOnSiteHubPageClient from "@/components/project/MaterialOnSiteHubPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialOnSiteHubPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialOnSiteHubPageClient projectId={projectId} />
}
