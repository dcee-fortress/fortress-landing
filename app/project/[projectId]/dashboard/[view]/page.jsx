import ProjectDashboardPageClient from "@/components/project/ProjectDashboardPageClient"
import { isActiveProject } from "@/lib/projectList"
import { isValidDashboardView } from "@/lib/projectRoutes"
import { notFound } from "next/navigation"

export default async function DashboardPage({ params }) {
  const { projectId, view } = await params

  if (!isActiveProject(projectId) || !isValidDashboardView(view)) {
    notFound()
  }

  return <ProjectDashboardPageClient projectId={projectId} view={view} />
}
