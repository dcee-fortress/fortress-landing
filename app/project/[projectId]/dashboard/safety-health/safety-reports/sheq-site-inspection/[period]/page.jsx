import SheqSiteInspectionPeriodListPageClient from "@/components/project/SheqSiteInspectionPeriodListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const VALID_PERIODS = new Set(["daily", "weekly", "monthly"])

export default async function SheqSiteInspectionPeriodPage({ params }) {
  const { projectId, period } = await params

  if (!isActiveProject(projectId) || !VALID_PERIODS.has(period)) {
    notFound()
  }

  return <SheqSiteInspectionPeriodListPageClient projectId={projectId} period={period} />
}
