import ProgressReportDetailPageClient from "@/components/project/ProgressReportDetailPageClient"
import { getProjectForRoute, isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProgressReportPage({ params }) {
  const { projectId, reportId } = await params
  const project = getProjectForRoute(projectId)

  if (!project || !isActiveProject(projectId)) {
    notFound()
  }

  return (
    <ProgressReportDetailPageClient
      projectId={projectId}
      reportId={reportId}
      projectName={project.name}
    />
  )
}
