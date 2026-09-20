import InductionRegistersPageClient from "@/components/project/InductionRegistersPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function InductionRegistersPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <InductionRegistersPageClient projectId={projectId} />
}
