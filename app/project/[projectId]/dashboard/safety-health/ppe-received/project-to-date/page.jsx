import PpeReceivedRollupPageClient from "@/components/project/PpeReceivedRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProjectToDatePpeReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <PpeReceivedRollupPageClient
      projectId={projectId}
      title="Project to date PPE received"
      description="Cumulative PPE received quantities and total cost across all daily files for this project."
      mode="project-to-date"
    />
  )
}
