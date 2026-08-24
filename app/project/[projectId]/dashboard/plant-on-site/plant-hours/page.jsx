import PlantHoursPageClient from "@/components/project/PlantHoursPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PlantHoursPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PlantHoursPageClient projectId={projectId} />
}
