import MaterialOnSiteDailyListPageClient from "@/components/project/MaterialOnSiteDailyListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyMaterialOnSitePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialOnSiteDailyListPageClient projectId={projectId} />
}
