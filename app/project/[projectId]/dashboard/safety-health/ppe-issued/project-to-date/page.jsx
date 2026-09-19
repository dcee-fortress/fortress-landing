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
      description="Project-to-date table of PPE description, quantities, and total cost rolled up from all daily PPE issued entries."
      mode="project-to-date"
    />
  )
}
