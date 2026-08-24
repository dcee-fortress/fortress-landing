import RateAnalysisPeriodPageClient from "@/components/project/RateAnalysisPeriodPageClient"
import { isActiveProject } from "@/lib/projectList"
import {
  getRateAnalysisDetailHref,
  isRateAnalysisFileListPeriod,
} from "@/lib/rateAnalysis"
import { notFound, redirect } from "next/navigation"

export default async function RateAnalysisPeriodPage({ params }) {
  const { projectId, period } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  if (period === "project-to-date") {
    redirect(getRateAnalysisDetailHref(projectId, period, "project-to-date"))
  }

  if (!isRateAnalysisFileListPeriod(period)) {
    notFound()
  }

  return <RateAnalysisPeriodPageClient projectId={projectId} period={period} />
}
