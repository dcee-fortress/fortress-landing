import SiteReportsPageClient from "@/components/project/SiteReportsPageClient"
import { isActiveProject } from "@/lib/projectList"
import { isSiteReportPeriod } from "@/lib/siteReports"
import { notFound } from "next/navigation"

export default async function SiteReportPeriodPage({ params }) {
  const { projectId, period } = await params

  if (!isActiveProject(projectId) || !isSiteReportPeriod(period)) {
    notFound()
  }

  return <SiteReportsPageClient projectId={projectId} period={period} />
}
