import MaterialSchedulePageClient from "@/components/project/MaterialSchedulePageClient"
import { getProjectForRoute, isActiveProject } from "@/lib/projectList"
import { getDailyFile } from "@/lib/projects"
import { isValidMaterialScheduleType } from "@/lib/materialSchedule"
import { notFound } from "next/navigation"

export default async function MaterialSchedulePage({ params }) {
  const { projectId, dayId, slotId, scheduleType } = await params
  const project = getProjectForRoute(projectId)

  if (!project || !isActiveProject(projectId) || !isValidMaterialScheduleType(scheduleType)) {
    notFound()
  }

  const file = getDailyFile(projectId, dayId)

  return (
    <MaterialSchedulePageClient
      projectId={projectId}
      projectName={project.name}
      dayId={dayId}
      dayLabel={file?.label ?? dayId}
      slotId={slotId}
      scheduleType={scheduleType}
    />
  )
}
