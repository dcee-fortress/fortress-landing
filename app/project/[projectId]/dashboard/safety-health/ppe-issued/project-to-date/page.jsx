import PpeIssuedRollupPageClient from "@/components/project/PpeIssuedRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProjectToDatePpeIssuedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <PpeIssuedRollupPageClient
      projectId={projectId}
      title="Project to date PPE issued"
      description="Cumulative PPE issued quantities and total cost across all daily files for this project."
      mode="project-to-date"
    />
  )
}
