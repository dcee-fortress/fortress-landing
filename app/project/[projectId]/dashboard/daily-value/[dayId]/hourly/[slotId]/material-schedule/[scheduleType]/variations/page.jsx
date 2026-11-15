import ValuationVariationsPageClient from "@/components/project/ValuationVariationsPageClient"
import { getProjectForRoute, isActiveProject } from "@/lib/projectList"
import { getDailyFile } from "@/lib/projects"
import { isValidMaterialScheduleType } from "@/lib/materialSchedule"
import { notFound } from "next/navigation"

export default async function ValuationVariationsPage({ params }) {
  const { projectId, dayId, slotId, scheduleType } = await params
  const project = getProjectForRoute(projectId)

  if (!project || !isActiveProject(projectId) || !isValidMaterialScheduleType(scheduleType)) {
    notFound()
  }

  const file = getDailyFile(projectId, dayId)

  return (
    <ValuationVariationsPageClient
      projectId={projectId}
      dayId={dayId}
      dayLabel={file?.label ?? dayId}
      slotId={slotId}
      scheduleType={scheduleType}
    />
  )
}
