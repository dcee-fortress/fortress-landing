import RateAnalysisDetailPageClient from "@/components/project/RateAnalysisDetailPageClient"
import { isActiveProject } from "@/lib/projectList"
import {
  getRateAnalysisDetailHref,
  isRateAnalysisFileListPeriod,
} from "@/lib/rateAnalysis"
import { notFound, redirect } from "next/navigation"

export default async function RateAnalysisDetailPage({ params }) {
  const { projectId, period, fileId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  if (period === "project-to-date") {
    redirect(getRateAnalysisDetailHref(projectId, period, "project-to-date"))
  }

  if (!isRateAnalysisFileListPeriod(period)) {
    notFound()
  }

  return (
    <RateAnalysisDetailPageClient projectId={projectId} period={period} fileId={fileId} />
  )
}
