import MaterialOnSiteWeekPageClient from "@/components/project/MaterialOnSiteWeekPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyMaterialOnSiteFilePage({ params }) {
  const { projectId, weekId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialOnSiteWeekPageClient projectId={projectId} weekId={weekId} />
}
