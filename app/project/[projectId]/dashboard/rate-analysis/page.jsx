import { isActiveProject } from "@/lib/projectList"
import { getSiteReportsHref } from "@/lib/projectRoutes"
import { notFound, redirect } from "next/navigation"

export default async function RateAnalysisPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  redirect(getSiteReportsHref(projectId))
}
