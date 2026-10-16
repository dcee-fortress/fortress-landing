import MaterialOnSiteRollupPageClient from "@/components/project/MaterialOnSiteRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProjectToDateMaterialOnSitePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return (
    <MaterialOnSiteRollupPageClient
      projectId={projectId}
      title="Project to date material on site"
      description="Each description shows its cumulative quantity from the project start through today. The yearly total and the project to date total use the same daily material entries."
      mode="project-to-date"
    />
  )
}
