import CeoDashboardsPageClient from "@/components/project/CeoDashboardsPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function CeoDashboardsPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <CeoDashboardsPageClient projectId={projectId} />
}
