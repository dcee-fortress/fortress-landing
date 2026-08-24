import PlantOnSitePageClient from "@/components/project/PlantOnSitePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PlantOnSitePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PlantOnSitePageClient projectId={projectId} />
}
