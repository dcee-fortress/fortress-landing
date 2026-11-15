import QsOverviewPeriodPageClient from "@/components/project/QsOverviewPeriodPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const PERIODS = new Set(["daily", "weekly", "monthly"])

export default async function QsOverviewFilePage({ params }) {
  const { projectId, period, fileId } = await params

  if (!isActiveProject(projectId) || !PERIODS.has(period) || !fileId) {
    notFound()
  }

  return <QsOverviewPeriodPageClient projectId={projectId} period={period} fileId={fileId} />
}
