import SheqSiteInspectionPageClient from "@/components/project/SheqSiteInspectionPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SheqSiteInspectionPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SheqSiteInspectionPageClient projectId={projectId} />
}
