import ProgressReportsPageClient from "@/components/project/ProgressReportPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProgressReportsPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <ProgressReportsPageClient projectId={projectId} />
}
