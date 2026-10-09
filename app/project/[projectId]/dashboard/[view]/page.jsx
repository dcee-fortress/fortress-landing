import ProjectDashboardPageClient from "@/components/project/ProjectDashboardPageClient"
import { isActiveProject } from "@/lib/projectList"
import { getCeoWorkValuedHref, isValidDashboardView } from "@/lib/projectRoutes"
import { notFound, redirect } from "next/navigation"

export default async function DashboardPage({ params }) {
  const { projectId, view } = await params

  if (!isActiveProject(projectId) || !isValidDashboardView(view)) {
    notFound()
  }

  // Project to date valuations are CEO EXCLUSIVE only.
  if (view === "project-to-date") {
    redirect(getCeoWorkValuedHref(projectId))
  }

  return <ProjectDashboardPageClient projectId={projectId} view={view} />
}
