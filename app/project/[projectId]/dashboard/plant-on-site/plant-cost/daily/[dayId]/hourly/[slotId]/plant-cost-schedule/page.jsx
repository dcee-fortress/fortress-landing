import PlantCostSchedulePageClient from "@/components/project/PlantCostSchedulePageClient"
import { isActiveProject } from "@/lib/projectList"
import { getDailyFile } from "@/lib/projects"
import { notFound } from "next/navigation"

export default async function PlantCostSchedulePage({ params }) {
  const { projectId, dayId, slotId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  const file = getDailyFile(projectId, dayId)

  if (!file) {
    notFound()
  }

  return (
    <PlantCostSchedulePageClient
      projectId={projectId}
      dayId={dayId}
      dayLabel={file.label}
      slotId={slotId}
    />
  )
}
