import CeoWorkValuedPageClient from "@/components/project/CeoWorkValuedPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function CeoWorkValuedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <CeoWorkValuedPageClient projectId={projectId} />
}
