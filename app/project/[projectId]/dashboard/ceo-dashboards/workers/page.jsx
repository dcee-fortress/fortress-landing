import CeoWorkersPageClient from "@/components/project/CeoWorkersPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function CeoWorkersPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <CeoWorkersPageClient projectId={projectId} />
}
