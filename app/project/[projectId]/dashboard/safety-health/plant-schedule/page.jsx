import PlantSchedulePageClient from "@/components/project/PlantSchedulePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PlantSchedulePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PlantSchedulePageClient projectId={projectId} />
}
