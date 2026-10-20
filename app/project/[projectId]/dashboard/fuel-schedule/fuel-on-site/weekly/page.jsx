import MaterialOnSiteWeeklyListPageClient from "@/components/project/MaterialOnSiteWeeklyListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyMaterialOnSitePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialOnSiteWeeklyListPageClient projectId={projectId} />
}
