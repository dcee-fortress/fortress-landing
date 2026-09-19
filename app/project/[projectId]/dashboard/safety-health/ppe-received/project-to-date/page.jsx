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
      description="Project-to-date table of PPE description, quantities, and total cost rolled up from all daily PPE received entries."
      mode="project-to-date"
    />
  )
}
