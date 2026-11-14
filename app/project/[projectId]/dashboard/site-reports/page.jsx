import SiteReportsPageClient from "@/components/project/SiteReportsPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SiteReportsPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SiteReportsPageClient projectId={projectId} />
}
