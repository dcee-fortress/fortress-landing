import SiteStaffRegisterPageClient from "@/components/project/SiteStaffRegisterPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SiteStaffRegisterPage({ params }) {
  const { projectId, monthId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SiteStaffRegisterPageClient projectId={projectId} monthId={monthId} />
}
