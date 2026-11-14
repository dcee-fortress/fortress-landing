import SiteReportPageClient from "@/components/project/SiteReportPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const PERIODS = new Set(["daily", "weekly", "monthly"])

export default async function SiteReportFilePage({ params }) {
  const { projectId, period, fileId } = await params

  if (!isActiveProject(projectId) || !PERIODS.has(period) || !fileId) {
    notFound()
  }

  return <SiteReportPageClient projectId={projectId} period={period} fileId={fileId} />
}
