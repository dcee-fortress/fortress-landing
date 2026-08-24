import PlantOperatorsPageClient from "@/components/project/PlantOperatorsPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PlantOperatorsPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PlantOperatorsPageClient projectId={projectId} />
}
