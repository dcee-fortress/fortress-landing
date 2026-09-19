import SiteStaffRegistersPageClient from "@/components/project/SiteStaffRegistersPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SiteStaffRegistersPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SiteStaffRegistersPageClient projectId={projectId} />
}
