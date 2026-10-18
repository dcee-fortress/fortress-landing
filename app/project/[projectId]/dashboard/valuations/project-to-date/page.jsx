import ValuationsProjectToDatePageClient from "@/components/project/ValuationsProjectToDatePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ValuationsProjectToDatePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <ValuationsProjectToDatePageClient projectId={projectId} />
}
