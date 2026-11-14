import SiteReportDocumentPageClient from "@/components/project/SiteReportDocumentPageClient"
import { isActiveProject } from "@/lib/projectList"
import { isSiteReportPeriod } from "@/lib/siteReports"
import { notFound } from "next/navigation"

export default async function SiteReportFilePage({ params }) {
  const { projectId, period, fileId } = await params

  if (!isActiveProject(projectId) || !isSiteReportPeriod(period) || !fileId) {
    notFound()
  }

  return <SiteReportDocumentPageClient projectId={projectId} period={period} fileId={fileId} />
}
