import PlantCostPageClient from "@/components/project/PlantCostPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PlantCostPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PlantCostPageClient projectId={projectId} />
}
