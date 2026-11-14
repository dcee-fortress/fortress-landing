import SiteReportsPageClient from "@/components/project/SiteReportsPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const PERIODS = new Set(["daily", "weekly", "monthly"])

export default async function SiteReportsPeriodPage({ params }) {
  const { projectId, period } = await params

  if (!isActiveProject(projectId) || !PERIODS.has(period)) {
    notFound()
  }

  return <SiteReportsPageClient projectId={projectId} period={period} />
}
