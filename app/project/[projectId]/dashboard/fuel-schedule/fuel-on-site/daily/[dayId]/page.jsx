import MaterialOnSiteDayPageClient from "@/components/project/MaterialOnSiteDayPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyMaterialOnSiteDayPage({ params }) {
  const { projectId, dayId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialOnSiteDayPageClient projectId={projectId} dayId={dayId} />
}
