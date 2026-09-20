import SheqSiteInspectionEntryPageClient from "@/components/project/SheqSiteInspectionEntryPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const VALID_PERIODS = new Set(["daily", "weekly", "monthly"])

export default async function SheqSiteInspectionEntryPage({ params }) {
  const { projectId, period, periodId } = await params

  if (!isActiveProject(projectId) || !VALID_PERIODS.has(period) || !periodId) {
    notFound()
  }

  return (
    <SheqSiteInspectionEntryPageClient
      projectId={projectId}
      period={period}
      periodId={periodId}
    />
  )
}
