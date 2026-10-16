import MaterialOnSiteMonthPageClient from "@/components/project/MaterialOnSiteMonthPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MonthlyMaterialOnSiteFilePage({ params }) {
  const { projectId, monthId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialOnSiteMonthPageClient projectId={projectId} monthId={monthId} />
}
