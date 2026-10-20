import MaterialOnSiteMonthlyListPageClient from "@/components/project/MaterialOnSiteMonthlyListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MonthlyMaterialOnSitePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialOnSiteMonthlyListPageClient projectId={projectId} />
}
