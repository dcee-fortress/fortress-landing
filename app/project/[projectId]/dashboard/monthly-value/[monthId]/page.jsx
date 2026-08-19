import MonthlyReportPageClient from "@/components/project/MonthlyReportPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MonthlyFilePage({ params }) {
  const { projectId, monthId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <MonthlyReportPageClient projectId={projectId} monthId={monthId} />
}
