import ActualProgressUpdatePageClient from "@/components/project/ActualProgressUpdatePageClient"
import { getProjectForRoute, isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyActualProgressUpdatePage({ params }) {
  const { projectId, reportId } = await params
  const project = getProjectForRoute(projectId)

  if (!project || !isActiveProject(projectId)) {
    notFound()
  }

  return (
    <ActualProgressUpdatePageClient
      projectId={projectId}
      reportId={reportId}
      projectName={project.name}
      reportType="weekly"
    />
  )
}
