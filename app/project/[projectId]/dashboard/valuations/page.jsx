import ValuationsPageClient from "@/components/project/ValuationsPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ValuationsPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <ValuationsPageClient projectId={projectId} />
}
