import QsOverviewPeriodPageClient from "@/components/project/QsOverviewPeriodPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const PERIODS = new Set(["daily", "weekly", "monthly"])

export default async function QsOverviewPeriodPage({ params }) {
  const { projectId, period } = await params

  if (!isActiveProject(projectId) || !PERIODS.has(period)) {
    notFound()
  }

  return <QsOverviewPeriodPageClient projectId={projectId} period={period} />
}
