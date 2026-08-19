import PlantCostProjectToDatePageClient from "@/components/project/PlantCostProjectToDatePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PlantCostProjectToDatePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PlantCostProjectToDatePageClient projectId={projectId} />
}
