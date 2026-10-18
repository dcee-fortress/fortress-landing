import EngineeringPageClient from "@/components/project/EngineeringPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function EngineeringPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <EngineeringPageClient projectId={projectId} />
}
